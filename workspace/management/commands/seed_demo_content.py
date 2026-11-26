"""Fill an empty DocuTrust workspace with believable demo content.

The data describes a fictional Karachi logistics company, Harbourline Logistics
(Pvt.) Ltd. Everything is created through the same services, models and audit
helpers the API uses, while ``django.utils.timezone.now`` is replaced by a fake
clock so every row, and every audit event, lands on a realistic working-day
timeline over roughly the last 25 days.

Usage (use a throwaway database while experimenting)::

    python manage.py seed_demo_content            # no-op if documents exist
    python manage.py seed_demo_content --reset    # only possible while no audit events exist
"""

import io
from datetime import datetime, timedelta, timezone as dt_timezone
from unittest import mock

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from docx import Document as DocxDocument

from workspace import providers, services
from workspace.audit import append_audit, verify_chain
from workspace.models import (
    AIMessage,
    AIThread,
    Announcement,
    AuditEvent,
    DemoPersona,
    Department,
    Note,
    TeamMessage,
    TeamRoom,
    WorkspaceDocument,
    WorkspaceRole,
)
from workspace.policies import Actor, accessible_documents
from workspace.retrieval import permitted_chunks, rank_chunks
from workspace.seed import seed
from workspace.views import access_summary

COMPANY = "Harbourline Logistics (Pvt.) Ltd."
PKT = dt_timezone(timedelta(hours=5))  # Karachi has no daylight saving time.
WORKDAYS = 17  # Timeline slots; the last slot is the most recent weekday before today.

# ---------------------------------------------------------------------------
# Documents. Markdown-style text; ".docx" files are built from the same layout.
# ---------------------------------------------------------------------------

LEAVE_POLICY = """# Leave Policy

Owner: Human Resources. Applies to: all permanent employees of Harbourline Logistics. Reviewed every July.

## 1. Purpose
This policy explains how much leave you are entitled to, how to apply for it and what happens to leave that is not used by the end of the year. It applies to every permanent employee, including people on probation unless a section says otherwise.

## 2. Annual entitlements
- Annual leave: 20 working days per calendar year, accrued monthly from your joining date.
- Casual leave: 10 working days per year for urgent personal matters. Casual leave cannot be joined to annual leave for more than three days at a time.
- Sick leave: 8 working days per year. A medical certificate is required when you are absent for more than two consecutive days.
- Maternity leave: 90 days on full pay. Paternity leave: 5 working days on full pay, taken within 30 days of the birth.
- Public holidays follow the federal and Sindh government notifications. Warehouse and dispatch staff who work on a public holiday receive a compensatory day off within 30 days.

## 3. Applying for leave
Submit every leave request through the HR portal. Your line manager approves or declines within two working days. Planned leave of three days or more should be requested at least seven days in advance. For unplanned absence, call or message your line manager before 9:30 am on the first day and record the leave in the HR portal when you return. Leave that is not recorded in the HR portal is treated as unpaid.

## 4. Carry-over of unused annual leave
Annual leave is meant to be taken within the year. Employees may carry over up to five unused annual leave days into the first quarter of the next year. Carried-over days must be taken by 31 March; any carried-over day not taken by that date lapses and is not paid out. To carry days over, submit the request through the HR portal before 15 December. Requests made after 15 December are not accepted, except where HR confirms in writing that the business, and not the employee, prevented the leave from being taken. Unused days above the five-day limit lapse on 31 December. Casual leave and sick leave cannot be carried over.

## 5. Probation
Annual leave accrues during probation but can only be taken after the first three months, unless your line manager and HR agree otherwise for an emergency. Sick leave is available from the first day of employment.

## 6. Unpaid leave and Hajj or Umrah
Unpaid leave of up to 15 working days may be granted once during employment, for example for Hajj or Umrah, if your manager confirms the team can cover your work. It is requested through the HR portal at least 30 days in advance.

## 7. Questions
Write to the HR team at hr@harbourline.example or ask in the HR Team room. Disputes about leave balances are checked against the HR portal record.
"""

EXPENSE_POLICY = """# Travel and Expense Policy

Owner: Finance. Applies to: all employees. All amounts are in Pakistani rupees (PKR).

## 1. Principles
Spend company money as carefully as you would spend your own. Every claim must be business related, supported by original receipts and submitted on time. Finance may decline a claim that does not follow this policy.

## 2. Pre-approval for travel
Travel expenses above PKR 40,000 per trip need written pre-approval from your line manager before booking. An email or a comment in the expense portal is enough; a verbal agreement is not. Bookings made without written pre-approval are not reimbursed, even if the trip turned out to be necessary. Trips below PKR 40,000 do not need pre-approval but the claim must still state the business reason. Travel outside Pakistan always needs the written approval of the CEO in addition to your line manager.

## 3. Flights, hotels and local transport
- Domestic flights: economy class, booked at least seven days ahead where possible through the travel desk in Finance.
- Hotels: up to PKR 18,000 per night in Karachi, Lahore and Islamabad and up to PKR 14,000 per night elsewhere in Pakistan. Anything above the cap needs approval from Finance before you confirm the room.
- Local transport: use company vehicles or a ride-hailing app. If you use your own car for company business, mileage is reimbursed at PKR 35 per kilometre with a trip log.

## 4. Meals and client hospitality
- Daily allowance on overnight trips outside your home city: PKR 6,500, no receipts needed.
- Client hospitality: up to PKR 5,000 per head with your line manager's approval. Attach the guest list to the claim.

## 5. Submitting and paying claims
Submit the claim in the expense portal within 10 working days of the expense. Claims with missing receipts for any item above PKR 1,000 are returned to you. Your line manager approves within three working days and Finance pays approved claims into your salary account within 10 working days after that.

## 6. Advances
A travel advance of up to 70 percent of the approved estimate can be requested from Finance at least three working days before departure. The advance must be settled within seven days of your return, otherwise it is deducted from your next salary.

## 7. What is not reimbursed
Traffic fines and challans, personal purchases, room upgrades, minibar charges, travel insurance for family members and any booking that did not receive the pre-approval required in section 2.
"""

REMOTE_POLICY = """# Remote Work Policy

Owner: Human Resources. Applies to: office-based roles. Warehouse, dispatch floor and driver roles work on site.

## 1. What is allowed
Eligible employees may work remotely for up to two days per week, as agreed with their line manager. Fridays are allowed as remote days. The two days do not have to be fixed; your manager and you can agree a monthly pattern, as long as the team keeps enough people in the office on Mondays and on the days customers visit. Remote days cannot be saved up or exchanged for extra days later in the month.

## 2. Agreeing remote days
Remote work always needs the agreement of your line manager. Agree the pattern for the month by the last working day of the previous month and record it on the team calendar. If your manager asks you to come in on a remote day for a meeting or an audit, you do so without notice period, and the day can be moved within the same week.

## 3. Availability
- You are reachable on chat and phone during core hours, 10:00 am to 4:00 pm Pakistan time.
- Start and finish times follow your normal schedule unless your manager agrees something else.
- Update your status in the team room when you are away from your desk for more than an hour.

## 4. Equipment and connectivity
The company laptop is the only device allowed to open company systems from home. Connect through the company VPN before opening any internal system. Public Wi-Fi in cafes, malls and airports must not be used for company work unless the VPN is on. Employees approved for regular remote work receive an internet allowance of PKR 3,000 per month, paid with salary.

## 5. Power cuts and emergencies
If load shedding or an internet failure stops you from working, tell your manager at once and either move to a co-working space approved by your manager or take the day as an office day. A one-off day moved for this reason does not count against your two remote days.

## 6. Probation
Employees in their first three months can work remotely only when their line manager agrees in writing for that specific day.

## 7. Working from another city or country
Working remotely from a city other than your home city for more than one week needs your manager's approval and a note to HR so that payroll and insurance records stay correct. Working from outside Pakistan is not allowed without the written approval of the CEO, because of tax and data protection rules.

## 8. Security at home
Do not let family members use your company laptop. Keep documents on the company drive rather than on the laptop desktop, lock the screen whenever you leave your desk and follow the Information Security Handbook. Customer documents must not be printed at home.

## 9. Review of remote days
Remote work depends on results. If targets slip or the team cannot reach you during core hours, your manager can withdraw remote days after talking to you first. HR reviews this policy every July with the department heads.
"""

INFOSEC_HANDBOOK = """# Information Security Handbook

Owner: Information Technology. Applies to: employees, contractors and visitors who use Harbourline systems.

## 1. Why this matters
Our customers trust us with shipment data, contract rates and delivery addresses. One lost laptop or one clicked phishing link can expose all of it. These rules are short on purpose: please read them once and keep to them every day.

## 2. Accounts and passwords
- Passwords must have at least 12 characters and must never be reused from personal accounts.
- Multi-factor authentication (MFA) is mandatory for email, the VPN, the HR portal and the finance system.
- Administrator accounts are rotated every 90 days; other passwords are changed only when you suspect they are exposed.
- Never share a login. If a colleague needs access, ask IT to grant it under their own name.

## 3. Devices
Company laptops use full-disk encryption and lock automatically after five minutes of inactivity. Lock your screen when you stand up, even in the office. Do not install software that IT has not approved. Removable USB drives are blocked except for encrypted drives issued by IT.

## 4. Data classification
Data is Public, Internal, Confidential or Restricted. Customer contracts, salary data and bank details are Restricted and may only be shared with the people named on the document. Confidential and Restricted files must not be sent to personal email or messaging apps, and printouts must be collected from the printer immediately and shredded when no longer needed.

## 5. Phishing and email
Treat unexpected attachments, urgent payment requests and requests to change bank details with suspicion. Use the Report phishing button in your mail client and never reply to the sender. Finance confirms every change of vendor bank details by calling a number already on file.

## 6. Lost or stolen equipment and incidents
If a laptop, phone or access card is lost or stolen, report it to the IT helpdesk at it-helpdesk@harbourline.example or on extension 100 within one hour of noticing. IT disables the device remotely and, if needed, files a police report. Report suspected incidents the same way; you will not be blamed for reporting in good faith.

## 7. Backups and visitors
Servers and the shared drive are backed up every night and kept for 30 days. Restore requests go to IT. Visitors sign in at reception, wear a badge and are escorted at all times; they never connect to the internal network and use the guest Wi-Fi only.

## 8. Annual training
Every employee completes the security awareness course each year. New joiners complete it in their first two weeks.
"""

ONBOARDING = """NEW JOINER ONBOARDING CHECKLIST
Owner: Human Resources. Use one copy of this checklist for every new employee.

BEFORE THE FIRST DAY (HR)
- Signed offer letter and employment contract received.
- Copy of CNIC, two passport-size photographs and bank account details received.
- Employee record created in the HR portal and the line manager informed of the start date.
- Seat, ID card and access card requested from Admin.

BEFORE THE FIRST DAY (IT)
- Company email account and chat account created.
- Laptop prepared with disk encryption, antivirus and the standard software set.
- MFA enrolment scheduled for the first morning. Remote work access is not enabled until probation review unless the line manager asks.

BEFORE THE FIRST DAY (FINANCE)
- Payroll record created. Joiners who start after the 20th receive their first salary with the following month's pay run.
- Expense portal access given if the role travels.

FIRST DAY
- 9:30 am: welcome by the HR team, ID card issued, tour of the building.
- 10:30 am: IT hands over the laptop and completes MFA enrolment. The new joiner changes the temporary password.
- 12:00 pm: lunch with the team and the line manager.
- 2:00 pm: warehouse and dispatch staff attend the safety induction before they enter the warehouse floor.
- The line manager explains the first week plan and assigns a buddy.

FIRST WEEK
- Read and acknowledge in the HR portal: Leave Policy, Travel and Expense Policy, Remote Work Policy and the Information Security Handbook.
- Meet the heads of the departments the new joiner works with most.
- Complete the security awareness course within the first two weeks.

30, 60 AND 90 DAYS
- Check-in with the line manager at 30 and 60 days to agree goals and fix any problems early.
- Probation review at 90 days. HR sends the confirmation letter after the line manager and HR sign off.

DEPARTMENT SPECIFIC ITEMS
- Finance joiners: access to the finance system is approved by the Finance Controller and enabled only after the security course is complete.
- Warehouse and dispatch joiners: safety shoes and a high-visibility vest are issued by the store on the first day and the shift supervisor signs the induction form.
- Drivers: licence copy and medical fitness certificate are checked by HR and the Fleet and Warehouse Manager before the first route.

BUDDY
Every new joiner gets a buddy from the same team who answers practical questions for the first month: where to park, how to book a meeting room, who approves what. The buddy and the new joiner meet for fifteen minutes every Friday for four weeks.

IF SOMETHING IS MISSING
If equipment or access is not ready on the first day, the line manager informs HR and IT by 10:00 am. IT aims to fix missing access within four working hours.
"""

WAREHOUSE_SAFETY = """# Warehouse Safety Checklist

Owner: Operations. Applies to: everyone who enters the Korangi warehouse floor, including visitors and drivers.

## 1. Before you enter the floor
- Safety shoes with steel toe caps and a high-visibility vest are compulsory for everyone.
- A hard hat is required in racking aisles and wherever forklifts are loading at height.
- Cut-resistant gloves are required when you open cartons or handle strapping and pallet wrap.
- Visitors are accompanied by a supervisor and sign the visitor register.

## 2. Forklifts and pallet trucks
- Only operators with a valid company forklift licence may drive a forklift. Keys stay with the shift supervisor.
- Speed limit on the warehouse floor is 10 km/h and forklifts give way to pedestrians in marked walkways.
- Forks are lowered when the vehicle is not moving and the handbrake is applied before you step off.
- No passengers on forklifts and pallet trucks.

## 3. Racking and storage
- Never exceed the load plate on the rack. The maximum safe stack height is shown on each bay.
- Heavy items go on the lowest level. Damaged pallets are tagged red and removed at once.
- Aisles and fire exits stay clear. Nothing is stored within one metre of a fire extinguisher or electrical panel.
- Manual lifting is limited to 25 kg per person; use a trolley or ask for help above that.

## 4. Heat and long shifts
Karachi summers make the warehouse very hot. From April to September every shift has a water break at least once an hour, and supervisors move staff between loading and cooler tasks. Anyone feeling dizzy or unwell tells the supervisor immediately and rests in the shaded area.

## 5. Fire and emergencies
- Fire extinguishers are inspected on the first working day of every month and the inspection tag is signed.
- The emergency assembly point is next to Gate 2. A fire drill is held every quarter.
- The first aid box is at the dispatch desk and the shift supervisor knows who is trained in first aid.

## 6. Incidents and end of shift
Every injury, near miss or damaged goods incident is reported to the shift supervisor during the same shift and entered in the incident register. At the end of each shift the supervisor completes this checklist: floor clear, forklifts parked and charging, doors locked, extinguishers in place. Nobody works alone in the warehouse after 8:00 pm.
"""

FLEET_SCHEDULE = """# Fleet Maintenance Schedule

Owner: Fleet and Warehouse Management (Logistics). Covers 36 vehicles: 12 ten-wheeler trucks, 14 six-wheeler delivery trucks and 10 pickup vans.

## 1. Service intervals
- Engine oil and filter: every 12,000 km for ten-wheelers and six-wheelers, every 8,000 km for pickup vans.
- Brake inspection: every 20,000 km, and every time a vehicle comes back from a long-haul route to Lahore, Islamabad or Peshawar.
- Tyre rotation and pressure check: every 15,000 km. Tyres are replaced at 3 mm tread depth.
- Gearbox and differential oil: every 40,000 km.
- Annual fitness and route permit renewal: completed by the end of the month before expiry. Vehicles without a valid certificate do not leave the yard.

## 2. Daily driver checks
Before leaving the yard every driver checks tyres, lights, mirrors, oil and coolant levels, brakes and the load straps, and signs the pre-trip card. Any defect is reported to the fleet supervisor before the vehicle moves. Drivers also report unusual noise, smoke, warning lights or steering problems at once rather than at the next service.

## 3. Quarterly inspection weeks
A full inspection week is held in the second week of January, April, July and October. During that week the workshop inspects every vehicle in rotation: steering, suspension, exhaust, wiring, tracker unit and fire extinguisher. Dispatch plans routes so that no more than four vehicles are in the workshop on the same day.

## 4. Workshops and records
Planned servicing is done at Korangi Fleet Services, our contracted workshop, under a 24-hour turnaround agreement. Emergency repairs on the road go through the roadside service line on the dispatch desk. Every job is recorded on the vehicle log with date, odometer reading, parts replaced and the invoice number. Finance pays the workshop only against a signed job card.

## 5. Downtime rules
- No more than two vehicles per hub are off the road for planned service at the same time.
- A vehicle that fails the pre-trip check is replaced from the spare pool within two hours during working hours.
- A vehicle is not allowed on a long-haul route if a service is due within the next 1,500 km.

## 6. Responsibilities
The Fleet and Warehouse Manager owns the schedule and approves exceptions. Dispatch coordinators release vehicles for service. Finance tracks maintenance cost per kilometre and reports it every quarter.
"""

SLA_SUMMARY = """# Customer SLA Summary

Owner: Operations. This is the short version of what we promise customers in contracts. Use the signed contract if you need exact wording.

## 1. Service tiers
- Gold: dedicated account manager, 30-minute response on support tickets, monthly review meeting.
- Silver: shared account desk, 2-hour response, quarterly review meeting.
- Standard: email and phone support, response by the next business day.

## 2. Delivery windows
- Karachi city: same-day delivery when the booking is confirmed before 11:00 am, otherwise next morning.
- Lahore: 36 hours from pickup. Islamabad and Rawalpindi: 48 hours. Peshawar and Quetta: 72 hours.
- Delivery windows count business days only and start when the goods are scanned out of our warehouse.

## 3. Targets
Our company target is 96 percent on-time delivery per month and 99.5 percent of shipments delivered undamaged. Proof of delivery, with signature or photo, is uploaded within four hours of delivery.

## 4. Late deliveries and service credits
When a delivery is late for reasons within our control, the customer receives a service credit of 5 percent of the freight charge for each late day, up to a maximum of 20 percent of that charge. Delays caused by strikes, floods, road closures, port holds or incorrect customer paperwork are not counted.

## 5. Damage and loss claims
Customers must report damage or shortage within 48 hours of delivery and attach photographs. We confirm receipt of the claim within one business day and decide within seven business days. Compensation is limited to the declared value of the goods or the limit set in the contract, whichever is lower.

## 6. Reporting and escalation
Account managers send the monthly performance report by the 5th of the following month. A ticket that is not resolved within its response time is escalated to the Operations Manager, and after 24 hours to the CEO's office for Gold customers.

## 7. Special handling
- Cold chain and pharma shipments: a temperature log is attached to the proof of delivery, goods load only from the cold room and delivery windows are agreed in advance.
- High-value goods: sealed containers, two-person handover, GPS tracker and no overnight stops outside secured yards.
- Peak season: during Eid and year-end volumes, windows may extend by one business day when customers are told at least seven days earlier.

## 8. Changes to an SLA
Changes to tiers, windows and credits are agreed in writing between the account manager and the customer and recorded in the contract file. Nobody may promise a window shorter than the ones above without approval from the Operations Manager.
"""

VENDOR_PAYMENT = """# Vendor Payment Procedure

Owner: Finance. Confidential: for the Finance team only.

## 1. Onboarding a new vendor
Before a vendor can be paid for the first time, Finance collects the NTN and sales tax registration, a cancelled cheque or bank letter, a signed vendor form and two references where the vendor is not on the approved panel. The Finance Controller approves the vendor in the finance system. The person who requests a new vendor cannot be the person who approves it.

## 2. Three-way match
Every invoice is matched against the purchase order and the goods received note or the signed job card. Differences above 2 percent or PKR 5,000, whichever is lower, go back to the requesting department before payment. Invoices without a purchase order are only accepted for utilities, rent and fuel.

## 3. Payment terms and runs
Standard payment terms are 30 days from the date the invoice is received complete. Payment runs are held every Tuesday and Friday. Early payment is only made when the vendor offers a discount of at least 2 percent for payment within ten days and the cash plan allows it.

## 4. Approval limits
- Up to PKR 500,000: prepared by an Accounts Payable officer and approved by the Finance Controller.
- Above PKR 500,000 up to PKR 2,000,000: approved by the Finance Controller and the CEO.
- Above PKR 2,000,000: approved by the Finance Controller and the CEO, with a board member informed by email.
Splitting one payment into smaller ones to stay under a limit is a disciplinary matter.

## 5. Changes to bank details
A request to change a vendor's bank account is never accepted by email alone. Finance calls the vendor on the number already in the vendor master file, confirms the change with a second person at the vendor and records the call in the vendor file. The change takes effect only after the Finance Controller signs it.

## 6. Tax and urgent payments
Withholding tax is deducted at the applicable rates for filers and non-filers and a deduction certificate is issued after each payment. Urgent payments outside the Tuesday and Friday runs need an urgent payment form signed by the requesting department head and the Finance Controller.

## 7. Records and audit
Every payment file keeps the invoice, purchase order, goods received note, approval email and bank confirmation for seven years. Internal audit samples 25 payments every quarter and reports exceptions to the CEO.

## 8. Advances and deposits
Advance payments to vendors are allowed only for rent, security deposits and imported spare parts with a pro forma invoice, up to 30 percent of the order value, and with the same approvals as in section 4.

## 9. Disputes
If a vendor disputes a deduction or a payment date, Accounts Payable answers within three working days and records the discussion in the vendor file. Unresolved disputes go to the Finance Controller.
"""

BUDGET_NOTES = """QUARTERLY BUDGET NOTES - Q2 FY27 (October to December)
Prepared by Kamran Iqbal, Finance. For the Finance team and the leadership group.

1. HEADLINE NUMBERS (PKR million)
- Revenue forecast: 412.0 against a budget of 398.0. First month actual was 128.4, which is 3 percent above plan, driven by pharma and FMCG volumes into Lahore.
- Total operating cost forecast: 361.5. Operating margin forecast: 12.3 percent.
- Fuel is the largest cost line at 38 percent of operating cost. The average diesel price used in the budget is PKR 285 per litre; every PKR 10 increase adds roughly PKR 4.3 million for the quarter.
- Payroll is 24 percent of operating cost, including the two new dispatch coordinators who join in November.

2. FLEET AND WAREHOUSE
- Fleet maintenance budget: 18.5 against a forecast of 19.2. The overspend comes from two gearbox replacements on ten-wheelers. The Q2 inspection week is paid from the same line.
- Korangi warehouse rent rises by 6 percent from 1 December under the renewed lease; the budget already includes it.
- Capital expenditure for four replacement trucks (PKR 96 million) is not part of this quarter. Board approval of the bank facility is expected in January.

3. CASH AND RECEIVABLES
- Receivables stand at 47 days against a target of 40. Two large customers are paying around day 58. Account managers will chase them every Monday.
- Payables are kept at 30 days. No early payment discounts are planned this quarter unless the cash plan improves.
- Minimum cash balance to hold at every month end: PKR 45 million.

4. DECISIONS AND ACTIONS
- Hold discretionary spend, such as events, training budgets and non-essential travel, at 90 percent of budget until receivables are below 43 days.
- Kamran to send the month-end variance report to Tariq sahib by the 5th.
- Usman to reforecast fuel using the new vendor rates after the contract renewal.
- Nadia to clear the backlog of vendor invoices older than 45 days by the end of the month.

5. RISKS TO WATCH
- Diesel: a sustained rise of more than PKR 15 per litre would take the quarter below the 12 percent operating margin promised to the board.
- Customer concentration: three customers contribute 52 percent of revenue. A delay in any one payment moves the cash balance by about PKR 20 million.
- Exchange rate: imported spare parts and tracker units are priced in dollars, so keep orders in rupees where the vendor allows it.

6. LOOKING AHEAD TO Q3
- Expect a seasonal dip in January and February; plan for revenue 6 percent lower than Q2.
- The salary review is budgeted at an 8 percent pool from 1 July. No mid-year change is planned.
- The Lahore warehouse lease is still a proposal and is not in any budget figure.
"""

SALARY_REVIEW = """# Salary Review Process

Owner: Human Resources. Confidential: HR and the CEO only. Do not forward or print.

## 1. Cycle and timing
Salaries are reviewed once a year. The cycle starts in May and increments take effect from 1 July. HR opens the cycle with a calendar to all line managers; late recommendations are carried into the next cycle unless the CEO approves otherwise.

## 2. Budget
The CEO and the Finance Controller set the increment pool as a percentage of payroll. For the current cycle the pool is 8 percent of total basic salary. HR distributes the pool by department in proportion to payroll and keeps 0.5 percent aside for corrections.

## 3. Ratings and increment ranges
- Exceeds expectations: 10 to 12 percent.
- Meets expectations: 6 to 9 percent.
- Needs improvement: 0 to 4 percent, together with a written improvement plan.
Employees who joined in the last six months are reviewed pro rata. Line managers recommend a percentage within the range and explain it in one paragraph.

## 4. Pay bands
Each grade has a minimum and maximum monthly basic salary: Grade C (officers and coordinators) PKR 120,000 to 180,000; Grade D (senior officers and supervisors) PKR 170,000 to 260,000; Grade E (managers) PKR 250,000 to 400,000. An increment cannot take anyone beyond the maximum of the band without CEO approval. Below-band salaries are corrected first, from the correction reserve.

## 5. Review and approval
HR checks every recommendation for consistency across teams and for equal treatment of similar roles. The Finance Controller confirms the total cost. The CEO approves the final list. Managers then share the outcome with their team members in a one-to-one conversation before letters are issued.

## 6. Promotions and off-cycle changes
Promotions are decided at the same time as the annual review. Off-cycle adjustments, for example to retain a critical warehouse supervisor, need a written case from the department head, the Finance Controller's cost estimate and CEO approval. HR records every change in the employee file with the date and the reason.

## 7. Communication and confidentiality
Salary information is shared on a need-to-know basis. Managers must not discuss anyone's salary with their team. Spreadsheets used in the cycle are stored in the restricted HR folder and are deleted from local drives after approval.

## 8. Disagreements
An employee who disagrees with the outcome can ask HR for a review within 14 days of the conversation. HR reviews the rating evidence with the line manager's manager and replies in writing within ten working days. If the disagreement continues, the CEO decides.

## 9. Calendar
May: HR opens the cycle and shares the templates. Early June: managers submit recommendations. Mid June: HR consolidates and the Finance Controller costs the list. Late June: the CEO approves. Before 1 July: letters are issued.
"""

BOARD_NOTES = """BOARD MEETING NOTES - CEO ONLY
Meeting held at the Karachi head office. Attendees: four board members, the CEO and the Finance Controller (for items 1 and 3).

1. Quarter in review
Revenue and margin are ahead of plan. The board asked management to keep receivables below 43 days before approving any new dividend. No dividend this half year.

2. Lahore hub expansion
Management proposed leasing a second warehouse of 40,000 square feet in Lahore, near the Ferozepur Road corridor, at about PKR 14 million per month. Two directors asked for a six-month volume commitment from the top three customers before signing. Decision: management to bring signed volume letters and a revised business case to the January meeting.

3. Fleet refresh financing
Replacement of four ten-wheeler trucks (PKR 96 million). Proposed financing: a bank facility of PKR 120 million at 3-month KIBOR plus 2 percent over five years, covering the trucks and tracker upgrades. The board approved starting negotiations with two banks. Final approval depends on comparing the quotes.

4. Key customer renewal
The largest pharma customer renewed for another year on its Gold tier. Rates are up by 4 percent, below the 7 percent management asked for. The board accepted the trade-off for the longer volume visibility.

5. Risks discussed
Diesel prices and exchange rate movement on imported spare parts; port congestion at Karachi; reliance on three customers for 52 percent of revenue; and the need to strengthen cyber security after peer companies were hit by ransomware.

6. Actions
- CEO to share the signed Lahore volume letters by 10 January.
- Finance Controller to circulate two bank term sheets before the next meeting.
- CEO to confirm the independent director appointment in writing.

7. Governance
The audit committee asked for the internal audit plan for next year and a review of the controls on vendor bank detail changes after an attempted payment fraud at a peer company. The Finance Controller confirmed that the call-back procedure is in force. One director raised succession planning for the Fleet and Warehouse Manager; the CEO will bring a short note.

8. Other business and next meeting
Directors thanked the team for the clean safety record at Korangi this year. The next meeting is in January and will cover the Lahore lease, the fleet financing decision and next year's budget.
"""

DRAFT_EXPENSE = """Travel and Expense Policy - DRAFT for comment

Owner: Finance. This draft is being replaced by the final policy and is kept only for the comparison of changes.

Travel pre-approval: written approval from the line manager is required for travel above PKR 50,000.
Hotels: up to PKR 16,000 per night in Karachi, Lahore and Islamabad.
Claims must be submitted within 15 working days.
Client hospitality up to PKR 4,000 per head with approval of the manager.
"""

DOCUMENTS = [
    # key, title, filename, text, owner, department, mode
    ("leave", "Leave Policy", "leave-policy.md", LEAVE_POLICY, "hr", None, "rbac"),
    ("expense", "Travel and Expense Policy", "travel-and-expense-policy.docx", EXPENSE_POLICY, "finance", None, "rbac"),
    ("remote", "Remote Work Policy", "remote-work-policy.md", REMOTE_POLICY, "hr", None, "rbac"),
    ("infosec", "Information Security Handbook", "information-security-handbook.docx", INFOSEC_HANDBOOK, "admin", None, "rbac"),
    ("onboarding", "New Joiner Onboarding Checklist", "new-joiner-onboarding-checklist.txt", ONBOARDING, "saima-javed", None, "rbac"),
    ("warehouse", "Warehouse Safety Checklist", "warehouse-safety-checklist.md", WAREHOUSE_SAFETY, "manager", "Operations", "rbac"),
    ("fleet", "Fleet Maintenance Schedule", "fleet-maintenance-schedule.docx", FLEET_SCHEDULE, "rizwan-baig", "Logistics", "rbac"),
    ("sla", "Customer SLA Summary", "customer-sla-summary.md", SLA_SUMMARY, "manager", "Operations", "rbac"),
    ("vendor", "Vendor Payment Procedure", "vendor-payment-procedure.docx", VENDOR_PAYMENT, "finance", "Finance", "rbac"),
    ("budget", "Quarterly Budget Notes (Q2 FY27)", "quarterly-budget-notes-q2-fy27.txt", BUDGET_NOTES, "finance", "Finance", "rbac"),
    ("salary", "Salary Review Process", "salary-review-process.md", SALARY_REVIEW, "hr", "Human Resources", "rbac"),
    ("board", "Board Meeting Notes", "board-meeting-notes.txt", BOARD_NOTES, "ceo", None, "scope"),
]

# ---------------------------------------------------------------------------
# People, departments and structure
# ---------------------------------------------------------------------------

DEPARTMENT_DESCRIPTIONS = {
    "Operations": "Customer delivery, dispatch coordination and account service across Pakistan.",
    "Finance": "Accounts payable and receivable, payroll accounting, budgeting and treasury.",
    "Human Resources": "Recruitment, onboarding, leave, payroll inputs and employee relations.",
}
NEW_DEPARTMENTS = [
    ("Information Technology", None, "Company systems, laptops, network, access control and information security."),
    ("Logistics", "Operations", "Fleet, Korangi warehouse and dispatch: vehicles, drivers and loading bays."),
]

# username -> (display name, role code, department, reports_to, managed departments)
EXISTING_PEOPLE = {
    "admin": ("Bilal Qureshi", "admin", "Information Technology", "ceo", []),
    "ceo": ("Tariq Mahmood Sheikh", "ceo", None, None, []),
    "manager": ("Sana Farooqui", "manager", "Operations", "ceo", ["Operations"]),
    "finance": ("Kamran Iqbal", "finance", "Finance", "ceo", []),
    "hr": ("Ayesha Siddiqui", "hr", "Human Resources", "ceo", []),
    "employee": ("Ahmed Raza", "employee", "Operations", "manager", []),
}
NEW_PEOPLE = [
    ("nadia-hussain", "Nadia Hussain", "finance", "Finance", "finance", []),
    ("usman-tariq", "Usman Tariq", "finance", "Finance", "finance", []),
    ("saima-javed", "Saima Javed", "hr", "Human Resources", "hr", []),
    ("rizwan-baig", "Rizwan Baig", "manager", "Logistics", "manager", ["Logistics"]),
    ("zainab-malik", "Zainab Malik", "employee", "Logistics", "rizwan-baig", []),
    ("hamza-shaikh", "Hamza Shaikh", "supervisor", "Logistics", "rizwan-baig", []),
    ("fatima-noor", "Fatima Noor", "employee", "Operations", "manager", []),
    ("asad-mirza", "Asad Mirza", "employee", "Operations", "manager", []),
    ("omar-farooq", "Omar Farooq", "employee", "Information Technology", "admin", []),
]
TITLES = {  # only used in the printed summary
    "admin": "IT and administration",
    "ceo": "Chief Executive",
    "manager": "Operations manager",
    "finance": "Finance controller",
    "hr": "HR manager",
    "employee": "Operations coordinator",
}

# ---------------------------------------------------------------------------
# Team rooms and their conversations. (workday, "HH:MM" Karachi time, username, text)
# ---------------------------------------------------------------------------

ROOMS = [
    # name, description, scope, department, creator, members (extra), created at
    ("Finance Team", "Payment runs, month-end close and budget questions for Finance.", "department", "Finance", "admin", [], (1, "10:00")),
    ("HR Team", "Recruitment, leave and employee queries handled by the HR team.", "department", "Human Resources", "admin", [], (1, "10:08")),
    ("Operations Floor", "Daily dispatch updates, customer escalations and roster changes.", "department", "Operations", "manager", [], (1, "11:00")),
    ("Logistics Dispatch", "Vehicle allocation, route changes and workshop slots for the Korangi yard.", "department", "Logistics", "rizwan-baig", [], (1, "15:20")),
    ("Leadership", "Budget, people and customer topics for the leadership group only.", "members", None, "ceo", ["admin", "manager", "finance", "hr"], (1, "12:00")),
    ("Fleet Refresh Project", "Replacing four ten-wheelers: quotes, financing, trackers and delivery dates.", "members", None, "rizwan-baig", ["manager", "finance", "zainab-malik", "hamza-shaikh"], (3, "11:00")),
]

MESSAGES = {
    "General": [
        (0, "11:05", "ceo", "Assalam o alaikum everyone. Our policies and handbooks are now in DocuTrust, so please search there before forwarding PDFs on WhatsApp. If something is missing, tell Ayesha or Bilal."),
        (0, "11:12", "hr", "Ji Tariq sahib. Leave, remote work and onboarding documents are already uploaded. The expense policy follows tomorrow."),
        (0, "11:20", "employee", "Thanks. Does the AI search only read the documents we are allowed to see?"),
        (0, "11:26", "admin", "Yes Ahmed, it only uses documents you have access to, and every question is recorded in the audit trail. Finance and HR files stay with their teams."),
        (3, "16:40", "asad-mirza", "Good news team: our largest pharma customer has renewed for another year. Thank you to dispatch for the clean on-time record."),
        (3, "16:52", "ceo", "Excellent news Asad. Well done to the whole team."),
        (13, "13:10", "omar-farooq", "IT notice: the Wi-Fi at the Korangi office will drop for about 20 minutes at 2 pm while we replace an access point. Please use mobile data if something is urgent."),
        (13, "14:32", "omar-farooq", "Wi-Fi is back. Please reconnect and tell me if anything still drops."),
        (9, "10:15", "saima-javed", "Two new dispatch coordinators join us next month. Please help them find their way around the Korangi site when they arrive."),
        (9, "10:30", "zainab-malik", "Will do. Chai is on us for their first day."),
        (13, "09:20", "ceo", "Friendly reminder to read the leave carry-over announcement. Deadline is 15 December, so plan your leave with your managers now."),
        (13, "09:41", "employee", "Noted sir. I have already put my request in the HR portal."),
        (15, "12:05", "fatima-noor", "Kisi ke paas Lahore hub ka direct number hai? Ek customer parcel ke baare mein pooch raha hai."),
        (15, "12:11", "zainab-malik", "Haan, hub line extension 3. Imran is the shift supervisor there. I will message you the number."),
    ],
    "Finance Team": [
        (1, "10:20", "finance", "Welcome to the Finance Team room. Please post payment run questions here instead of calling each other's desks."),
        (1, "10:34", "nadia-hussain", "Tuesday run list is ready, 23 invoices. Three are still waiting for the GRN from Korangi."),
        (1, "10:41", "finance", "Chase those GRNs with Rizwan sahib today. No GRN, no payment. Same rule as always."),
        (2, "09:48", "usman-tariq", "Diesel vendor sent the revised rate card, PKR 3 per litre higher from the 1st. I will update the fuel forecast."),
        (2, "09:55", "finance", "Okay. Please finish it before I send the budget notes."),
        (4, "11:12", "nadia-hussain", "A vendor asked to change their bank account by email. Not processing it. I am calling them back on the number in the master file."),
        (4, "11:20", "finance", "Good catch Nadia. Log the call in the vendor file and I will sign the change after."),
        (5, "15:05", "usman-tariq", "Month-end variance sheet is on the shared drive. Fleet maintenance is PKR 0.7 million over because of the two gearboxes."),
        (5, "15:18", "finance", "Thanks. I will explain that to Tariq sahib. Receivables are the bigger worry, we are at 47 days."),
        (8, "10:02", "nadia-hussain", "Friday run: 31 invoices, total PKR 8.9 million. Two are above 500k and need Tariq sahib's approval."),
        (8, "10:09", "finance", "Sending the approval request now. Hold those two until he replies."),
        (8, "16:40", "nadia-hussain", "Approved by Tariq sahib. Both released."),
        (12, "12:30", "usman-tariq", "The new PKR 40,000 travel pre-approval limit is now showing up in claims. I have returned two claims that had no approval attached."),
        (12, "12:41", "finance", "Right. Please be polite when you return them and point people to the policy."),
        (15, "09:30", "finance", "Team, lunch ke baad 3 baje budget review hai mere room mein. Receivables ageing report saath le aana."),
        (15, "09:36", "nadia-hussain", "Ji sir, theek hai."),
    ],
    "HR Team": [
        (1, "10:30", "hr", "Created this room for HR. Saima, please use it for candidate scheduling updates too."),
        (1, "10:45", "saima-javed", "Okay. Interviews for the two dispatch coordinator roles are on Thursday, at 11 and 2."),
        (2, "09:20", "saima-javed", "Both shortlisted candidates confirmed. I will print the CVs and the scorecards."),
        (3, "14:10", "hr", "Offer letters for the dispatch coordinators are approved by Tariq sahib. Please send them today."),
        (3, "14:25", "saima-javed", "Sent both. Proposed joining date is the first Monday of next month."),
        (6, "11:00", "hr", "Ahmed from Operations asked about carrying leave into Q1. I told him up to five days, with the request on the portal before 15 December."),
        (6, "11:12", "saima-javed", "I will add it to the reminder email so everyone gets the same message."),
        (9, "10:50", "hr", "The salary review calendar goes to managers next Monday. Please keep the sheet locked, only you and me."),
        (9, "10:58", "saima-javed", "Ji, done. Access is limited to HR and Tariq sahib."),
        (13, "15:15", "saima-javed", "Medical certificate came in for Hamza, three days of sick leave. Entered in the portal."),
        (13, "15:22", "hr", "Thanks. Remember the rule is a certificate for more than two consecutive days."),
    ],
    "Operations Floor": [
        (1, "11:20", "manager", "Operations Floor is live. Daily dispatch updates, customer escalations and roster changes go here."),
        (1, "11:34", "employee", "Good. Today's Lahore load left at 6:40, all 14 pallets scanned out."),
        (2, "08:55", "fatima-noor", "The pharma account is asking where their Peshawar shipment is. Tracker shows it near Nowshera."),
        (2, "09:02", "manager", "Tell them delivery will be tomorrow before noon, it is inside the 72 hour window. Send the proof of delivery as soon as we have it."),
        (2, "09:05", "fatima-noor", "Okay, informing them now."),
        (4, "14:30", "asad-mirza", "A Gold customer wants a review meeting next week. Which day suits you, Sana madam?"),
        (4, "14:41", "manager", "Wednesday after 3 works. Please send the on-time numbers from the monthly report before the meeting."),
        (7, "09:12", "employee", "Saturday roster: we are three people short at the loading bay. Can someone from customer service help with paperwork?"),
        (7, "09:20", "manager", "Fatima and Asad will cover paperwork from 10 to 2. Ahmed, please brief them on the POD scanner."),
        (7, "09:24", "asad-mirza", "Ji theek hai, hum aa jayenge."),
        (10, "16:05", "fatima-noor", "POD for the Peshawar shipment is uploaded. The customer is happy with the delivery."),
        (10, "16:10", "manager", "Great. Let us add one line to our checklist: tell customers the 72 hour window up front."),
        (14, "11:45", "employee", "The Gate 2 assembly point signboard fell down in the wind. I have asked admin to fix it before the next fire drill."),
        (14, "11:52", "manager", "Good. Please send a photo once the new sign is up."),
    ],
    "Logistics Dispatch": [
        (1, "15:30", "rizwan-baig", "Logistics Dispatch is for vehicle allocation and route changes. Please keep it factual, one line per vehicle."),
        (1, "15:41", "zainab-malik", "Tomorrow's allocation: 4 ten-wheelers to Lahore, 3 six-wheelers to Hyderabad and interior Sindh, vans for city runs."),
        (2, "08:15", "hamza-shaikh", "Truck KHI-4471 failed the pre-trip check, the brake pedal is soft. I pulled it from the roster."),
        (2, "08:20", "rizwan-baig", "Good call Hamza. Send it to Korangi Fleet Services today and use a spare from the pool."),
        (2, "08:24", "zainab-malik", "Spare allocated. The Lahore run leaves on time."),
        (5, "17:10", "hamza-shaikh", "Forklift 3 battery is not holding charge. We will use forklifts 2 and 4 tomorrow."),
        (5, "17:20", "rizwan-baig", "Noted. I will raise the replacement request with Finance."),
        (8, "13:00", "zainab-malik", "Peshawar route: the highway is closed near Attock for two hours. Driver is waiting at the toll plaza."),
        (8, "13:06", "rizwan-baig", "Keep the customer informed. Closures are excluded from the late credit but customers still like an update."),
        (11, "09:35", "hamza-shaikh", "Rizwan sahib, for the January inspection week, which vehicles do you want first?"),
        (11, "09:44", "rizwan-baig", "Ten-wheelers first, as per the schedule. Maximum four in the workshop on any day. Zainab, please plan routes around that."),
        (11, "09:46", "zainab-malik", "Ji bhai, I will share the plan by evening."),
    ],
    "Leadership": [
        (1, "12:20", "ceo", "This room is for the leadership group only. Budget, people and customer issues that should not go to the general rooms."),
        (3, "10:15", "finance", "First month revenue is PKR 128.4 million, 3 percent ahead of plan. Receivables are at 47 days though."),
        (3, "10:22", "ceo", "Good, but receivables are the priority. Sana, can the account managers chase the two slow payers?"),
        (3, "10:30", "manager", "Yes. Asad will call both this week. One of them has a dispute on a damage claim, I will check it."),
        (6, "12:05", "hr", "Update: two dispatch coordinators accepted their offers and join next month. The salary review calendar will go out soon."),
        (6, "12:12", "ceo", "Fine. Ayesha, please also give me a short note on attrition in the warehouse. I want to see if supervisors need a retention adjustment."),
        (6, "12:20", "hr", "Will do by Friday."),
        (9, "17:05", "admin", "Security update: MFA is on for 94 percent of accounts. The rest are warehouse tablets and I will fix them."),
        (9, "17:12", "ceo", "Good. Make it 100 percent before the board meeting."),
        (12, "11:30", "finance", "Bank term sheets: the first bank quoted KIBOR plus 2.25 percent. The second is waiting for our audited accounts."),
        (12, "11:38", "ceo", "Push the second bank. We need both quotes before January."),
        (15, "14:00", "manager", "Customer renewal meeting went well. They want a rate review in April, nothing more."),
        (15, "14:08", "ceo", "Alhamdulillah. Thanks Sana."),
    ],
    "Fleet Refresh Project": [
        (3, "11:20", "rizwan-baig", "Project room for the four-truck refresh. Goal: replace the oldest ten-wheelers before the summer peak."),
        (3, "11:35", "manager", "From the operations side we need delivery by April. Peak volume starts in May."),
        (3, "11:48", "finance", "The budget for the trucks is PKR 96 million, but the bank facility is still in negotiation. Please do not sign any purchase order yet."),
        (5, "10:10", "rizwan-baig", "Got quotes from two dealers. Dealer A is PKR 24.8 million per truck, delivery in 14 weeks. Dealer B is PKR 23.9 million, delivery in 20 weeks."),
        (5, "10:25", "finance", "Dealer B is PKR 3.6 million cheaper in total but the delivery misses April. Let us ask whether 16 weeks is possible."),
        (7, "11:00", "omar-farooq", "Thanks for adding me. For the tracker upgrade: the new units are 4G and report every 10 seconds instead of every minute."),
        (7, "11:12", "rizwan-baig", "Good. Please include the tracker price per truck in the comparison."),
        (7, "11:30", "hamza-shaikh", "Drivers want a better seat and air conditioning in the cabin. Let us put it in the spec."),
        (7, "11:34", "rizwan-baig", "Noted. AC cabin is already included in both quotes."),
        (10, "14:20", "omar-farooq", "The tracker vendor offers PKR 38,000 per unit including installation, with one year of data."),
        (10, "14:32", "finance", "That is PKR 152,000 for four. Please send the quote to Nadia for the purchase order file."),
        (13, "10:05", "rizwan-baig", "Dealer B came back with 17 weeks at the same price. I recommend them, April is still possible with a small buffer."),
        (13, "10:20", "manager", "I agree. Let us take it to Tariq sahib for approval after the bank decision."),
    ],
}

# ---------------------------------------------------------------------------
# Announcements and notes
# ---------------------------------------------------------------------------

ANNOUNCEMENTS = [
    # key, workday, time, title, level, pinned, body
    ("expense", 3, "14:00", "Travel pre-approval limit is now PKR 40,000", "important", False,
     "Any trip with travel expenses above PKR 40,000 now needs written pre-approval from your line manager before you book. "
     "Bookings made without that approval will not be reimbursed. An email is enough; attach it to your expense claim.\n\n"
     "The full rules are in the Travel and Expense Policy in DocuTrust."),
    ("training", 5, "09:30", "Security awareness training is due this month", "info", True,
     "Every employee must complete the 40-minute security awareness course within the next two weeks. The link was sent from "
     "it-helpdesk@harbourline.example. New joiners complete it within their first two weeks.\n\n"
     "Multi-factor authentication is mandatory for email and the VPN. If you have not enrolled yet, visit the IT desk at Korangi or ask Omar."),
    ("maintenance", 8, "11:00", "System maintenance window on Saturday night", "info", False,
     "Email, VPN and the shared drive will be unavailable on Saturday between 1:00 am and 4:00 am Pakistan time while IT upgrades the servers. "
     "Please save your work and log out before you leave on Friday. Warehouse scanners and the tracking system are not affected."),
    ("maintenance-dup", 8, "11:05", "System maintenance window on Saturday night", "info", False,
     "Email, VPN and the shared drive will be unavailable on Saturday between 1:00 am and 4:00 am Pakistan time."),
    ("fleet", 10, "15:00", "Quarterly fleet inspection week in January", "info", False,
     "The next quarterly fleet inspection week is the second week of January. Dispatch will plan routes so that no more than four vehicles are in the "
     "workshop on any day. Drivers: please report any defect now rather than waiting for the inspection."),
    ("leave", 12, "10:00", "Year-end leave carry-over: request before 15 December", "important", True,
     "You may carry over up to five unused annual leave days into the first quarter. Submit the request in the HR portal before 15 December. "
     "Carried-over days must be taken by 31 March or they lapse. Leave above five days lapses on 31 December.\n\n"
     "Please agree your plan with your line manager first."),
    ("closure", 14, "12:30", "Offices closed on 25 December (Quaid-e-Azam Day)", "info", False,
     "All offices and the Korangi warehouse office are closed on 25 December. Dispatch will run a reduced roster for time-critical deliveries and "
     "supervisors will share the roster by 18 December. Staff who work on the day receive a compensatory day off within 30 days."),
]

NOTES = [
    # key, workday, time, title, pinned, body
    ("sync", 4, "16:30", "IT weekly sync - action items", True,
     "Attendees: Bilal, Omar, Rizwan (for the fleet trackers)\n\nDecisions\n"
     "- MFA rollout: the remaining 6% of accounts are warehouse tablets. Omar to enrol them by Friday.\n"
     "- Korangi Wi-Fi: replace two access points. Vendor visit next week.\n"
     "- Laptop refresh: Finance first, they have the oldest devices.\n\n"
     "Actions\n- Omar: tablet MFA enrolment, Friday\n- Bilal: ask Kamran for a budget line for the access points\n- Bilal: send the phishing reminder to all staff"),
    ("laptops", 6, "10:45", "Laptop refresh checklist", False,
     "Finance team laptops (8 devices)\n[ ] Order 8 laptops, 16 GB RAM, 512 GB SSD\n[ ] Get budget approval from Kamran\n[ ] Image with the standard software set\n"
     "[ ] Enable disk encryption and MFA\n[ ] Swap devices over a weekend\n[ ] Wipe and recycle the old laptops\n[ ] Update the asset register"),
    ("mfa-draft", 7, "15:20", "Draft: MFA reminder to all staff", False,
     "Subject: Please enrol in multi-factor authentication this week\n\nAssalam o alaikum,\n\n"
     "MFA is now mandatory for email and the VPN. It takes about three minutes: install the authenticator app, scan the code from the IT portal and "
     "confirm. If you need help, Omar will be at the Korangi IT desk every morning this week.\n\nThank you,\nBilal"),
    ("wifi", 10, "12:10", "Korangi Wi-Fi upgrade - vendor call", False,
     "Vendor quoted PKR 185,000 for two access points and cabling, installation in one day.\n"
     "Asked for: warranty terms (3 years?), guest network separate from staff, remote management.\n"
     "To check: does the warehouse back office need a third unit?\nNext step: send the quote to Kamran, decide by Friday."),
    ("onboarding", 9, "11:30", "Onboarding to-do: two dispatch coordinators", False,
     "Before day one\n- Email and chat accounts\n- Two laptops from the spare stock, encrypted\n- MFA enrolment slot at 10:30 on the first morning\n"
     "- Access to the dispatch board and the POD scanner app\n\nDay one\n- Hand over laptops, change temporary passwords\n- Short security briefing, 15 minutes\n"
     "- Remind them of the security course deadline"),
    ("access", 12, "16:00", "Quarterly access review - notes from meeting with Ayesha", True,
     "Checked who can open the HR and Finance documents.\n"
     "- Salary Review Process: HR team and CEO only. Correct.\n- Vendor Payment Procedure: Finance team only. Correct.\n"
     "- Board Meeting Notes: CEO only.\nTwo contractors still have active email accounts. Disable on Friday after confirming with Ayesha.\n"
     "Next review: in three months."),
]
NOTE_UPDATES = {
    "laptops": (11, "17:20",
                "Finance team laptops (8 devices)\n[x] Order 8 laptops, 16 GB RAM, 512 GB SSD\n[x] Get budget approval from Kamran\n[x] Image with the standard software set\n"
                "[ ] Enable disk encryption and MFA\n[ ] Swap devices over a weekend\n[ ] Wipe and recycle the old laptops\n[ ] Update the asset register"),
    "wifi": (13, "09:50",
             "Vendor quoted PKR 185,000 for two access points and cabling, installation in one day.\n"
             "Warranty: 3 years confirmed. Guest network separate from staff: yes. Remote management: yes.\n"
             "Kamran approved the budget. Installation booked for the Wi-Fi downtime slot."),
}

# ---------------------------------------------------------------------------
# AI chats. Each thread: owner, then turns of (workday, time, question, answer, evidence).
# ``answer=None`` means the documents do not cover the question and the
# assistant refuses, exactly as services.ask would. ``evidence`` lists phrases
# that must appear in the chunks cited for the answer.
# ---------------------------------------------------------------------------

CHAT_THREADS = [
    ("admin", [
        (3, "15:20", "How many unused leave days can I carry over into next year?",
         "You can carry over up to five unused annual leave days into the first quarter of next year. The carried-over days must be taken by 31 March, "
         "otherwise they lapse and are not paid out, and the request has to go through the HR portal before 15 December. "
         "Casual leave and sick leave cannot be carried over. [Source *]",
         ['carry over up to five', 'before 15 December']),
        (3, "15:24", "And what happens to the days above five?",
         "Unused annual leave above the five-day limit lapses on 31 December. [Source *]",
         ['above the five-day limit']),
    ]),
    ("admin", [
        (5, "10:05", "Do I need approval before booking a flight to Lahore that costs more than PKR 40,000?",
         "Yes. Travel expenses above PKR 40,000 per trip need written pre-approval from your line manager before you book. An email or a comment in the "
         "expense portal is enough, but a verbal agreement is not. Bookings made without written pre-approval are not reimbursed. [Source *]",
         ['need written pre-approval', 'are not reimbursed']),
    ]),
    ("admin", [
        (7, "14:10", "How many days a week can people work remotely, and are Fridays allowed?",
         "Eligible employees may work remotely up to two days per week, as agreed with their line manager, and Fridays are allowed as remote days. "
         "Warehouse, dispatch floor and driver roles work on site, and in the first three months a manager must agree in writing to each remote day. [Source *]",
         ['up to two days per week', 'work on site', 'first three months']),
    ]),
    ("admin", [
        (9, "11:50", "What does IT need to prepare before a new employee's first day?",
         "Before the first day IT creates the company email and chat accounts, prepares the laptop with disk encryption, antivirus and the standard software, "
         "and schedules MFA enrolment for the first morning. On the first day IT hands over the laptop at 10:30 am and completes MFA enrolment, and the new "
         "joiner changes the temporary password. Remote access is not enabled until the probation review unless the line manager asks. [Source *]",
         ['Company email account', 'IT hands over the laptop']),
    ]),
    ("admin", [
        (11, "16:15", "What should someone do if their laptop is lost, and how quickly?",
         "Report it to the IT helpdesk at it-helpdesk@harbourline.example or on extension 100 within one hour of noticing. IT then disables the device remotely "
         "and, if needed, files a police report. Nobody is blamed for reporting in good faith. [Source *]",
         ['within one hour of noticing', 'disables the device remotely']),
        (11, "16:19", "Is MFA required for the VPN as well?",
         "Yes. Multi-factor authentication is mandatory for email, the VPN, the HR portal and the finance system. [Source *]",
         ['Multi-factor authentication (MFA) is mandatory']),
    ]),
    ("employee", [
        (4, "10:15", "Can I work from home on Fridays?",
         "Yes, Fridays are allowed as remote days. You can work remotely up to two days a week, but only with your line manager's agreement, and they may ask you "
         "to come in on a remote day for a meeting or an audit. You need to be reachable on chat and phone between 10:00 am and 4:00 pm. [Source *]",
         ['Fridays are allowed', 'asks you to come in', 'core hours']),
    ]),
    ("employee", [
        (8, "09:40", "What protective equipment do I need on the warehouse floor?",
         "Safety shoes with steel toe caps and a high-visibility vest are compulsory for everyone on the floor. You also need a hard hat in racking aisles and "
         "wherever forklifts are loading at height, and cut-resistant gloves when you open cartons or handle strapping and pallet wrap. [Source *]",
         ['Safety shoes', 'hard hat', 'cut-resistant gloves']),
    ]),
    ("employee", [
        (10, "15:30", "Is there a staff bus to the Korangi warehouse?", None, []),
    ]),
    ("employee", [
        (12, "11:05", "How much can I claim for a hotel in Lahore?",
         "Hotels are reimbursed up to PKR 18,000 per night in Karachi, Lahore and Islamabad. Anything above the cap needs approval from Finance before you confirm "
         "the room. A trip with total travel expenses above PKR 40,000 also needs written pre-approval from your line manager before booking. [Source *]",
         ['PKR 18,000 per night', 'above PKR 40,000']),
    ]),
    ("finance", [
        (6, "14:00", "When are vendor payment runs held and who approves payments above PKR 500,000?",
         "Payment runs are held every Tuesday and Friday. Payments up to PKR 500,000 are approved by the Finance Controller. Anything above PKR 500,000 up to "
         "PKR 2,000,000 needs both the Finance Controller and the CEO, and above PKR 2,000,000 a board member is also informed by email. [Source *]",
         ['Payment runs are held every Tuesday', 'Above PKR 500,000']),
    ]),
    ("hr", [
        (7, "11:15", "What increment range applies to someone who meets expectations in the salary review?",
         "Employees who meet expectations receive an increment of 6 to 9 percent. The line manager recommends a percentage within the range with a short "
         "explanation, and increments take effect from 1 July. [Source *]",
         ['Meets expectations: 6 to 9 percent', 'take effect from 1 July']),
    ]),
    ("manager", [
        (9, "13:30", "How often do the delivery trucks need an oil change and a brake inspection?",
         "Engine oil and filter are changed every 12,000 km for ten-wheelers and six-wheelers and every 8,000 km for pickup vans. Brakes are inspected every "
         "20,000 km and after every long-haul return from Lahore, Islamabad or Peshawar. [Source *]",
         ['Engine oil and filter', 'Brake inspection']),
    ]),
]

SEARCHES = [
    (4, "09:50", "employee", "leave carry over"),
    (4, "10:30", "manager", "service credit late delivery"),
    (6, "14:05", "finance", "vendor bank details change"),
    (7, "11:25", "hr", "salary increment ratings"),
    (9, "14:50", "admin", "password MFA"),
    (10, "11:05", "employee", "remote work internet allowance"),
    (12, "09:15", "manager", "fleet inspection week"),
    (13, "11:10", "saima-javed", "first day checklist"),
    (14, "10:40", "admin", "visitors badge guest wifi"),
]
VIEWS = [  # workday, time, username, document key, event
    (4, "09:55", "employee", "leave", "document.view"),
    (6, "14:12", "finance", "vendor", "document.view"),
    (7, "11:35", "hr", "salary", "document.view"),
    (7, "11:40", "hr", "salary", "document.download"),
    (9, "15:00", "manager", "fleet", "document.view"),
    (11, "10:00", "employee", "warehouse", "document.download"),
    (13, "11:20", "saima-javed", "onboarding", "document.view"),
]
# (workday, time, uploader, document key) - the order of this list is not important.
UPLOADS = [
    (0, "10:40", "leave"), (0, "12:05", "infosec"), (0, "14:30", "remote"), (0, "14:50", "draft"),
    (1, "09:50", "expense"), (1, "10:30", "onboarding"), (1, "12:00", "warehouse"), (1, "15:10", "fleet"),
    (2, "10:20", "sla"), (2, "11:00", "vendor"), (2, "14:15", "budget"), (2, "15:30", "salary"),
    (3, "09:40", "board"),
]


class FakeClock:
    """Stand-in for ``django.utils.timezone.now`` that only ever moves forward."""

    def __init__(self, start):
        self.current = start

    def __call__(self):
        return self.current

    def jump(self, when):
        self.current = max(self.current, when)

    def tick(self, seconds):
        self.current += timedelta(seconds=seconds)


def utc(day, hhmm, seconds=0):
    hour, minute = (int(part) for part in hhmm.split(":"))
    local = datetime(day.year, day.month, day.day, hour, minute, seconds, tzinfo=PKT)
    return local.astimezone(dt_timezone.utc)


def build_docx(text, author, when):
    document = DocxDocument()
    document.core_properties.author = author
    document.core_properties.created = when
    document.core_properties.modified = when
    for raw in text.splitlines():
        line = raw.rstrip()
        if not line.strip():
            continue
        if line.startswith("#"):
            document.add_heading(line.lstrip("#").strip(), level=min(len(line) - len(line.lstrip("#")), 3))
        elif line.startswith("- "):
            document.add_paragraph(line[2:], style="List Bullet")
        else:
            document.add_paragraph(line)
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


class DemoSeeder:
    def __init__(self, days, clock, stdout):
        self.days, self.clock, self.out = days, clock, stdout
        self.items = []
        self.people, self.depts, self.roles = {}, {}, {}
        self.docs, self.rooms, self.threads, self.notes = {}, {}, {}, {}
        self.stored_files = []
        self.announcements = {}
        self.catalog_model = "qwen2.5:0.5b"
        self.documents_by_key = {d[0]: d for d in DOCUMENTS}
        self.documents_by_key["draft"] = (
            "draft", "Travel and Expense Policy (draft)", "travel-expense-policy-draft.txt", DRAFT_EXPENSE,
            "finance", "Finance", "rbac",
        )

    # -- scheduling -------------------------------------------------------
    def at(self, workday, hhmm, action, *args):
        self.items.append((utc(self.days[workday], hhmm), len(self.items), action, args))

    def run(self):
        for when, order, action, args in sorted(self.items, key=lambda item: item[:2]):
            self.clock.jump(when + timedelta(seconds=(order * 13) % 47))
            action(*args)

    def actor(self, username):
        return Actor(self.people[username])

    # -- structure --------------------------------------------------------
    def prepare(self):
        """Names and join dates for the people and structure that already existed before the timeline starts."""
        horizon = self.days[0]
        for offset, username in enumerate(["ceo", "hr", "finance", "manager", "employee", "admin"]):
            joined = utc(horizon - timedelta(days=60 + offset * 57), "10:00")
            DemoPersona.objects.filter(username=username).update(created_at=joined)
        founded = utc(horizon - timedelta(days=400), "10:00")
        WorkspaceRole.objects.filter(created_at__gt=founded).update(created_at=founded)
        Department.objects.filter(created_at__gt=founded).update(created_at=founded)
        TeamRoom.objects.filter(is_general=True, created_at__gt=founded).update(created_at=founded)
        for username, (name, *_rest) in EXISTING_PEOPLE.items():
            DemoPersona.objects.filter(username=username).update(display_name=name)
        # Load after the updates so later full saves cannot write stale values back.
        self.roles = {role.code: role for role in WorkspaceRole.objects.all()}
        self.depts = {dept.name: dept for dept in Department.objects.all()}
        self.people = {p.username: p for p in DemoPersona.objects.select_related("role", "department")}

    def schedule_structure(self):
        for index, (name, description) in enumerate(DEPARTMENT_DESCRIPTIONS.items()):
            self.at(0, f"09:0{index * 3}", self.describe_department, name, description)
        self.at(0, "09:20", self.create_department, NEW_DEPARTMENTS[0])
        self.at(0, "09:24", self.create_department, NEW_DEPARTMENTS[1])
        self.at(0, "09:30", self.create_role)
        self.at(0, "09:36", self.move_admin_to_it)
        for index, spec in enumerate(NEW_PEOPLE):
            self.at(0, f"{9 + (40 + index * 5) // 60:02d}:{(40 + index * 5) % 60:02d}", self.create_member, spec)
        self.at(8, "09:30", self.promote_zainab)

    def describe_department(self, name, description):
        dept = self.depts[name]
        dept.description = description
        dept.save()
        append_audit(self.actor("admin"), "department.update", "department", dept.pk, {"name": dept.name})

    def create_department(self, spec):
        name, parent, description = spec
        dept = Department.objects.create(name=name, parent=self.depts.get(parent), description=description)
        self.depts[name] = dept
        append_audit(self.actor("admin"), "department.create", "department", dept.pk, {"name": name})

    def create_role(self):
        role = WorkspaceRole.objects.create(
            code="supervisor", name="Supervisor", permissions=[],
            description="Shift and yard supervisors in logistics and the warehouse.",
        )
        self.roles["supervisor"] = role
        append_audit(self.actor("admin"), "role.create", "role", role.pk, {"code": role.code, "permissions": role.permissions})

    def move_admin_to_it(self):
        admin = self.people["admin"]
        admin.department = self.depts["Information Technology"]
        admin.reports_to = self.people["ceo"]
        admin.save()
        self.member_event("member.update", admin, admin)

    def promote_zainab(self):
        zainab = self.people["zainab-malik"]
        zainab.role = self.roles["supervisor"]
        zainab.save()
        self.member_event("member.update", self.people["admin"], zainab)

    def member_event(self, event_type, actor_persona, member):
        if event_type == "member.create":
            details = {"username": member.username, "role": member.role.code}
        else:
            details = {
                "username": member.username, "role": member.role.code,
                "department": member.department.name if member.department else "", "active": member.is_active,
            }
        append_audit(Actor(actor_persona), event_type, "member", member.pk, details)

    def create_member(self, spec):
        username, name, role, dept, reports, managed = spec
        persona = DemoPersona.objects.create(
            username=username, display_name=name, role=self.roles[role], department=self.depts[dept],
            reports_to=self.people[reports],
        )
        persona.managed_departments.set([self.depts[d] for d in managed])
        self.people[username] = persona
        self.member_event("member.create", self.people["admin"], persona)

    # -- documents --------------------------------------------------------
    def schedule_documents(self):
        for workday, hhmm, key in UPLOADS:
            self.at(workday, hhmm, self.upload, key)
        self.at(1, "10:55", self.delete_draft)
        self.at(3, "11:10", self.restrict, "vendor", {"departments": ["Finance"], "personas": []})
        self.at(3, "11:25", self.restrict, "salary", {"departments": ["Human Resources"], "personas": ["ceo"]})
        for workday, hhmm, username, query in SEARCHES:
            self.at(workday, hhmm, self.search, username, query)
        for workday, hhmm, username, key, event in VIEWS:
            self.at(workday, hhmm, self.touch, username, key, event)

    def upload(self, key):
        _key, title, filename, text, owner, dept, mode = self.documents_by_key[key]
        persona = self.people[owner]
        if filename.endswith(".docx"):
            content = build_docx(text, persona.display_name, self.clock.current)
        else:
            content = text.encode("utf-8")
        document = services.store_document(
            actor=Actor(persona), uploaded_file=SimpleUploadedFile(filename, content), title=title,
            department=self.depts[dept] if dept else None, access_mode=mode,
            grants={"roles": [], "departments": [], "personas": []},
        )
        self.stored_files.append(document.file.name)
        self.docs[key] = document

    def delete_draft(self):
        services.delete_document(self.actor("finance"), self.docs.pop("draft"))

    def restrict(self, key, grants):
        document = WorkspaceDocument.objects.get(pk=self.docs[key].pk)
        before = access_summary(document)
        document.access_mode = WorkspaceDocument.AccessMode.SCOPE
        document.save()
        document.department_grants.set([self.depts[name] for name in grants["departments"]])
        document.persona_grants.set([self.people[name] for name in grants["personas"]])
        document = WorkspaceDocument.objects.get(pk=document.pk)
        append_audit(self.actor("admin"), "document.access.update", "document", document.pk, {
            "title": document.title, "access_mode": document.access_mode,
            "access": access_summary(document), "previous_access": before,
        })

    def search(self, username, query):
        services.search_documents(self.actor(username), query)

    def touch(self, username, key, event):
        document = self.docs[key]
        append_audit(self.actor(username), event, "document", document.pk, {"title": document.title})

    # -- AI chats ---------------------------------------------------------
    def schedule_chats(self):
        for index, (owner, turns) in enumerate(CHAT_THREADS):
            for workday, hhmm, question, answer, evidence in turns:
                self.at(workday, hhmm, self.chat_turn, index, owner, question, answer, evidence)

    def chat_turn(self, key, owner, question, answer, evidence):
        persona = self.people[owner]
        actor = Actor(persona)
        thread = self.threads.get(key)
        first = thread is None
        if first:
            thread = self.threads[key] = AIThread.objects.create(owner=persona)
            self.clock.tick(3)
        documents = accessible_documents(actor)
        sources = [chunk for _score, chunk in rank_chunks(permitted_chunks([d.pk for d in documents]), question)]
        if answer is not None and not sources:
            raise CommandError(f"Seed question matched nothing for {owner}: {question}")
        audit = {
            "question": question, "provider": "local", "model": self.catalog_model,
            "sources": [{"document_id": c.document_id, "title": c.document.title} for c in sources],
        }
        if answer is None:
            text, status, citations = providers.REFUSAL_MESSAGE, AIMessage.Status.REFUSED, []
        else:
            # Cite only the retrieved chunks that actually contain what the answer says.
            cited = []
            for phrase in evidence:
                chunk = next((c for c in sources if phrase.lower() in c.text.lower()), None)
                if chunk is None:
                    raise CommandError(f"Seed answer for {owner} cites {phrase!r}, which retrieval no longer returns.")
                if chunk not in cited:
                    cited.append(chunk)
            marker = " ".join(f"[Source {n}]" for n in range(1, len(cited) + 1))
            text, status = answer.replace("[Source *]", marker), AIMessage.Status.ANSWERED
            citations = [services.citation(i, chunk) for i, chunk in enumerate(cited, start=1)]
        AIMessage.objects.create(thread=thread, kind=AIMessage.Kind.USER, content=question)
        self.clock.tick(7)
        AIMessage.objects.create(
            thread=thread, kind=AIMessage.Kind.ASSISTANT, content=text, status=status,
            citations=citations, provider="local", model=self.catalog_model,
        )
        thread.provider, thread.model = "local", self.catalog_model
        if first:
            thread.title = " ".join(question.split())[:80]
        self.clock.tick(1)
        thread.save()
        append_audit(actor, "chat.question", "chat", thread.pk, {
            **audit, "outcome": status.value, "cited": [c["title"] for c in citations],
        })
        if first:
            append_audit(actor, "chat.thread.create", "chat", thread.pk)

    # -- rooms ------------------------------------------------------------
    def schedule_rooms(self):
        self.rooms["General"] = TeamRoom.objects.get(is_general=True)
        for name, description, scope, dept, creator, members, (workday, hhmm) in ROOMS:
            self.at(workday, hhmm, self.create_room, name, description, scope, dept, creator, members)
        for name, messages in MESSAGES.items():
            for workday, hhmm, sender, text in messages:
                self.at(workday, hhmm, self.post_message, name, sender, text)
        self.at(7, "10:50", self.add_room_member, "Fleet Refresh Project", "rizwan-baig", "omar-farooq")

    def create_room(self, name, description, scope, dept, creator, members):
        room = TeamRoom.objects.create(
            name=name, description=description, scope=scope, department=self.depts[dept] if dept else None,
            created_by=self.people[creator],
        )
        if scope == "members":
            room.members.set([self.people[u] for u in {creator, *members}])
        self.rooms[name] = room
        append_audit(self.actor(creator), "team.room.create", "team_room", room.pk, {"name": name, "scope": scope})

    def add_room_member(self, name, by, username):
        room = self.rooms[name]
        room.members.add(self.people[username])
        append_audit(self.actor(by), "team.room.update", "team_room", room.pk, {"name": room.name, "scope": room.scope})

    def post_message(self, room_name, sender, text):
        room, persona = self.rooms[room_name], self.people[sender]
        TeamMessage.objects.create(room=room, sender=persona, sender_label=persona.display_name, content=text)
        append_audit(Actor(persona), "team.message.create", "team_room", room.pk, {"room": room.name, "length": len(text)})

    # -- announcements and notes -------------------------------------------
    def schedule_notices(self):
        for key, workday, hhmm, title, level, pinned, body in ANNOUNCEMENTS:
            self.at(workday, hhmm, self.announce, key, title, level, pinned, body)
        self.at(5, "13:00", self.edit_expense_announcement)
        self.at(8, "11:12", self.delete_announcement, "maintenance-dup")
        for key, workday, hhmm, title, pinned, body in NOTES:
            self.at(workday, hhmm, self.add_note, key, title, pinned, body)
        for key, (workday, hhmm, body) in NOTE_UPDATES.items():
            self.at(workday, hhmm, self.edit_note, key, body)

    def announce(self, key, title, level, pinned, body):
        admin = self.people["admin"]
        item = Announcement.objects.create(
            title=title, body=body, level=level, pinned=pinned, author=admin, author_label=admin.display_name,
        )
        self.announcements[key] = item
        append_audit(Actor(admin), "announcement.create", "announcement", item.pk, {"title": item.title, "level": item.level})

    def edit_expense_announcement(self):
        item = self.announcements["expense"]
        item.body += "\n\nQuestions about a specific trip? Ask Kamran Iqbal in Finance."
        item.save()
        append_audit(self.actor("admin"), "announcement.update", "announcement", item.pk, {"title": item.title})

    def delete_announcement(self, key):
        item = self.announcements.pop(key)
        title, pk = item.title, item.pk
        item.delete()
        append_audit(self.actor("admin"), "announcement.delete", "announcement", pk, {"title": title})

    def add_note(self, key, title, pinned, body):
        self.notes[key] = Note.objects.create(owner=self.people["admin"], title=title, body=body, pinned=pinned)

    def edit_note(self, key, body):
        note = self.notes[key]
        note.body = body
        note.save()

    # -- integrity checks recorded in the log --------------------------------
    def schedule_integrity(self):
        self.at(14, "10:00", self.history_view, "admin", "zainab-malik")
        self.at(15, "16:00", self.verify, "ceo")
        self.at(16, "10:30", self.verify, "admin")

    def history_view(self, by, username):
        member = self.people[username]
        append_audit(self.actor(by), "audit.history.view", "member", member.pk, {"viewed": member.display_name})

    def verify(self, by):
        valid, checked, _first, _head = verify_chain()
        append_audit(self.actor(by), "audit.verify", "audit", "chain", {"valid": valid, "events_checked": checked})


def working_days(now):
    """The most recent WORKDAYS weekdays before today, oldest first (Karachi dates)."""
    today = now.astimezone(PKT).date()
    days = [today - timedelta(days=n) for n in range(25, 0, -1)]
    return [day for day in days if day.weekday() < 5][-WORKDAYS:]


class Command(BaseCommand):
    help = (
        f"Fill the workspace with demo content for {COMPANY}: people, documents, chats, rooms, "
        "announcements, notes and a valid audit trail, spread over the last ~25 days."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset", action="store_true",
            help="Delete documents, chats, rooms (except General), messages, announcements and notes, then re-seed. "
                 "Refused while audit events exist because the audit log is immutable.",
        )

    def handle(self, *args, **options):
        seed(Role=WorkspaceRole, Department=Department, Persona=DemoPersona, Room=TeamRoom)
        if options["reset"]:
            self.reset()
        elif WorkspaceDocument.objects.exists():
            self.stdout.write("Demo content is already present (documents exist); nothing changed. Use --reset to start over.")
            return

        real_now = timezone.now()
        days = working_days(real_now)
        last_event = AuditEvent.objects.order_by("-sequence").first()
        start = utc(days[0], "08:30")
        clock = FakeClock(max(start, last_event.timestamp) if last_event else start)

        seeder = DemoSeeder(days, clock, self.stdout)
        local = next((p for p in providers.provider_catalog()["providers"] if p["id"] == "local"), None)
        seeder.catalog_model = (local or {}).get("default_model") or seeder.catalog_model

        try:
            with mock.patch("django.utils.timezone.now", clock), transaction.atomic():
                seeder.prepare()
                seeder.schedule_structure()
                seeder.schedule_documents()
                seeder.schedule_rooms()
                seeder.schedule_chats()
                seeder.schedule_notices()
                seeder.schedule_integrity()
                seeder.run()
        except BaseException:
            storage = WorkspaceDocument._meta.get_field("file").storage
            for name in seeder.stored_files:
                storage.delete(name)
            raise
        self.summary(seeder)

    def reset(self):
        if AuditEvent.objects.exists():
            raise CommandError(
                "Cannot reset: the audit log already has events and audit events are immutable. "
                "To start over, stop the server, delete the SQLite database file (and the media folder), "
                "then run migrate and seed_demo_content again."
            )
        with transaction.atomic():
            for document in WorkspaceDocument.objects.all():
                document.file.storage.delete(document.file.name)
            WorkspaceDocument.objects.all().delete()
            AIThread.objects.all().delete()
            TeamMessage.objects.all().delete()
            TeamRoom.objects.filter(is_general=False).delete()
            Announcement.objects.all().delete()
            Note.objects.all().delete()
        self.stdout.write("Removed existing demo documents, chats, rooms, messages, announcements and notes.")

    def summary(self, seeder):
        valid, checked, _first, _head = verify_chain()
        first = AuditEvent.objects.order_by("sequence").first()
        last = AuditEvent.objects.order_by("-sequence").first()
        counts = [
            ("members", DemoPersona.objects.count()),
            ("departments", Department.objects.count()),
            ("documents", WorkspaceDocument.objects.count()),
            ("AI chats", AIThread.objects.count()),
            ("rooms", TeamRoom.objects.count()),
            ("room messages", TeamMessage.objects.count()),
            ("announcements", Announcement.objects.count()),
            ("notes", Note.objects.count()),
            ("audit events", AuditEvent.objects.count()),
        ]
        self.stdout.write(self.style.SUCCESS(f"Seeded demo content for {COMPANY}"))
        self.stdout.write("  " + ", ".join(f"{label}: {value}" for label, value in counts))
        self.stdout.write(
            f"  timeline {first.timestamp:%Y-%m-%d} to {last.timestamp:%Y-%m-%d}; "
            f"audit chain {'valid' if valid else 'INVALID'} ({checked} events)"
        )
