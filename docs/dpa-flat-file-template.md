# Data Processing Agreement — Flat File Data License

**Template for: pharosIQ DaaS Flat File deliveries (T1 Accounts+Intent, T2 Persona+Intent, T3 Contacts+Intent, T4 Contacts+Content Enterprise)**

---

## Important framing note (read before sending)

This is structured as a **Controller-to-Controller Data Sharing Agreement** (GDPR Art. 26 / independent controllers), not a standard Article 28 Processor DPA.

**Why:** pharosIQ independently collects, aggregates, and licenses B2B contact and intent data from its own permissioned sources. When a customer receives a flat file, they ingest it into their own systems and decide independently how to use it. pharosIQ is not processing personal data "on behalf of" the customer, which is the defining test for processor status.

**If the customer's legal team insists on a processor DPA, push back.** Signing an Art. 28 processor DPA would:
- Require pharosIQ to delete or return licensed data on the customer's instruction (breaks the license)
- Grant the customer audit rights over pharosIQ's core data operations
- Subject pharosIQ to customer-directed processing instructions that conflict with how licensed data works

Suggested language for the pushback: *"pharosIQ is an independent controller of the licensed data, not a processor. The attached Controller-to-Controller Data Sharing Agreement (including GDPR-compliant Standard Contractual Clauses where applicable) is the correct instrument for a data license. A processor DPA would misrepresent the processing relationship."*

If they still need a "DPA" label for procurement's sake, the document can be titled **"Data Processing Agreement (Controller-to-Controller)"** without changing the substance.

---

# DATA PROCESSING AGREEMENT (CONTROLLER-TO-CONTROLLER)

**This Data Processing Agreement ("DPA")** is entered into as of {{EFFECTIVE_DATE}} ("Effective Date") between:

**pharosIQ, LLC** (formerly MRP Technology / CONTENTgine), a Delaware limited liability company with its principal place of business at {{PHAROSIQ_ADDRESS}} ("**pharosIQ**"),

and

**{{CUSTOMER_LEGAL_NAME}}**, a {{CUSTOMER_ENTITY_TYPE}} with its principal place of business at {{CUSTOMER_ADDRESS}} ("**Customer**").

Each a "Party" and collectively the "Parties."

This DPA supplements the Data License Agreement between the Parties dated {{MSA_DATE}} (the "Agreement"). In the event of any conflict between this DPA and the Agreement regarding the processing of Personal Data, this DPA controls.

---

## 1. Definitions

1.1 Capitalized terms used but not defined herein have the meanings set forth in the Agreement or in Applicable Data Protection Law.

1.2 "**Applicable Data Protection Law**" means all laws and regulations applicable to a Party's processing of Personal Data under this DPA, including without limitation: the EU General Data Protection Regulation 2016/679 ("**GDPR**"), the UK GDPR and Data Protection Act 2018, the California Consumer Privacy Act as amended by the California Privacy Rights Act (collectively, "**CCPA**"), and other US state privacy laws including the Virginia CDPA, Colorado CPA, Connecticut CTDPA, Utah UCPA, and Texas TDPSA.

1.3 "**Licensed Data**" means the flat file data products delivered by pharosIQ to Customer under the Agreement, including but not limited to firmographic records, contact records, job title data, technographic data, and intent signals, in CSV, JSON, Parquet, or other file formats.

1.4 "**Personal Data**" has the meaning given in GDPR Art. 4(1) and the equivalent definition of "Personal Information" under CCPA and other US state privacy laws, and refers to any Personal Data contained in the Licensed Data.

1.5 "**Data Subject**" means an identified or identifiable natural person to whom Personal Data relates. Under this DPA, Data Subjects are business professionals in their professional capacity.

1.6 "**Processing**," "**Controller**," "**Processor**," "**Sub-processor**," and "**Supervisory Authority**" have the meanings given in the GDPR.

1.7 "**Restricted Transfer**" means a transfer of Personal Data from the EEA, UK, or Switzerland to a country not subject to an adequacy decision under Applicable Data Protection Law.

1.8 "**Standard Contractual Clauses**" or "**SCCs**" means the standard contractual clauses approved by the European Commission in Decision 2021/914 of 4 June 2021, Module One (Controller to Controller), and the UK International Data Transfer Addendum (IDTA) where the UK is the exporting jurisdiction.

---

## 2. Relationship of the Parties

2.1 **Independent Controllers.** The Parties acknowledge and agree that, with respect to Personal Data contained in the Licensed Data, each Party acts as an **independent Controller**. pharosIQ is the Controller of the Licensed Data as sourced, aggregated, and licensed by pharosIQ. Customer is the Controller of the Licensed Data as used, stored, and processed within Customer's systems following delivery.

2.2 **No Processor Relationship.** Neither Party is a Processor, Sub-processor, joint Controller, or agent of the other with respect to the Licensed Data. pharosIQ does not process Personal Data on behalf of Customer, and Customer does not instruct pharosIQ on the means or purposes of pharosIQ's processing.

2.3 **Independent Compliance.** Each Party is independently responsible for compliance with Applicable Data Protection Law with respect to its own processing of Personal Data.

---

## 3. Scope and Purpose of Processing

3.1 **Subject Matter.** The licensing by pharosIQ to Customer of the Licensed Data via flat file delivery, and the subsequent independent processing of that data by Customer for the Permitted Purpose.

3.2 **Permitted Purpose.** Customer may process the Licensed Data solely for the internal business purposes specified in the Agreement, which include: (a) B2B sales and marketing activities; (b) account-based marketing and targeting; (c) lead enrichment and scoring; (d) analytics and modeling; and (e) other uses expressly authorized under the Agreement.

3.3 **Prohibited Uses.** Customer shall NOT:
   (a) resell, sublicense, redistribute, or otherwise make the Licensed Data available to any third party except as expressly permitted under the Agreement;
   (b) commingle the Licensed Data with third-party data in a manner that creates a derivative data product for resale;
   (c) use the Licensed Data to make automated decisions producing legal or similarly significant effects on Data Subjects;
   (d) use the Licensed Data for consumer marketing, credit decisions, employment decisions, insurance decisions, housing decisions, or any purpose governed by the Fair Credit Reporting Act (FCRA);
   (e) reverse-engineer, extract, or re-identify any anonymized or pseudonymized elements of the Licensed Data;
   (f) use the Licensed Data in violation of Applicable Data Protection Law, CAN-SPAM, TCPA, or equivalent laws in other jurisdictions.

3.4 **Duration.** Processing under this DPA continues for the term of the Agreement and any permitted post-termination use period specified therein.

3.5 **Categories of Data Subjects.** Business professionals and employees in their professional capacity, including executives, managers, and individual contributors at commercial organizations.

3.6 **Categories of Personal Data.** Business contact information including: full name, business email address, business phone number, job title, job function, seniority, employer name, business address, and professional profile data. Where included in the Licensed Data, associated intent signals reflect topic engagement at the account level or professional level, not sensitive personal categories.

3.7 **No Special Category Data.** pharosIQ does not knowingly include in the Licensed Data any special categories of Personal Data under GDPR Art. 9, or sensitive personal information under CCPA Cal. Civ. Code § 1798.140(ae), unless expressly agreed in writing.

---

## 4. pharosIQ's Obligations as Source Controller

4.1 **Lawful Basis.** pharosIQ represents that it collects and licenses the Licensed Data in reliance on: (a) legitimate interests under GDPR Art. 6(1)(f) for B2B professional contact data, with appropriate balancing tests on file; (b) consent under GDPR Art. 6(1)(a) where required for intent and engagement signals; and (c) compliant lawful bases under applicable US state privacy laws.

4.2 **Transparency.** pharosIQ maintains a privacy notice at {{PHAROSIQ_PRIVACY_URL}} describing its data collection, sources, uses, and Data Subject rights.

4.3 **Data Subject Rights.** pharosIQ handles access, deletion, correction, opt-out, and objection requests submitted directly to pharosIQ with respect to its source-of-record processing. pharosIQ publishes a suppression mechanism and will share suppression lists as described in Section 8.

4.4 **Provenance Representation.** pharosIQ represents that the Licensed Data is sourced through permissioned and compliant means, including but not limited to: owned-and-operated content engagement, partner network engagement, publicly available professional information, and licensed third-party sources.

---

## 5. Customer's Obligations as Recipient Controller

5.1 **Independent Compliance.** Customer shall comply with all Applicable Data Protection Law in Customer's processing of the Licensed Data.

5.2 **Customer Privacy Notice.** Customer shall maintain a public privacy notice that accurately describes Customer's use of Personal Data obtained from third-party data providers (including pharosIQ) and the lawful bases for such processing.

5.3 **Data Subject Rights in Customer Systems.** Customer shall have its own procedures to honor Data Subject rights requests (access, deletion, correction, objection, opt-out of "sale" or "sharing," portability) with respect to Licensed Data once ingested into Customer's systems. Customer is responsible for honoring opt-outs and suppressions in Customer's own marketing operations.

5.4 **Suppression Ingestion.** Customer shall ingest and honor pharosIQ's suppression list within {{SUPPRESSION_SLA_DAYS}} days of receipt, removing suppressed records from Customer's active datasets derived from the Licensed Data.

5.5 **Security of Received Data.** Customer shall maintain appropriate technical and organizational measures to protect Licensed Data in its possession, including those specified in Schedule 2.

5.6 **No Onward Enrichment Without Basis.** Customer shall not use the Licensed Data to enrich, append to, or combine with data collected without a lawful basis for such combination.

---

## 6. Sub-processors

6.1 Because this DPA governs a Controller-to-Controller relationship, neither Party engages the other's Sub-processors.

6.2 For delivery of the flat file, pharosIQ may use service providers (e.g., secure file transfer, cloud storage, encryption services) that act as pharosIQ's processors under separate arrangements. A current list of delivery-path service providers is available at {{PHAROSIQ_SUBPROCESSOR_URL}}.

---

## 7. International Transfers

7.1 **Cross-Border Transfers.** To the extent delivery of the Licensed Data constitutes a Restricted Transfer, the Parties agree to the SCCs (Module One, Controller-to-Controller) incorporated by reference, with the following selections:
   (a) **Clause 7 (Docking clause):** Applies.
   (b) **Clause 11 (Redress):** The optional independent dispute resolution body language does not apply.
   (c) **Clause 17 (Governing law):** {{EU_MEMBER_STATE}} law.
   (d) **Clause 18 (Choice of forum and jurisdiction):** Courts of {{EU_MEMBER_STATE}}.
   (e) **Annex I.A (Parties):** As set forth in the preamble of this DPA.
   (f) **Annex I.B (Description of transfer):** As set forth in Schedule 1.
   (g) **Annex I.C (Competent Supervisory Authority):** {{COMPETENT_SA}}.
   (h) **Annex II (Security):** As set forth in Schedule 2.

7.2 **UK Transfers.** For Restricted Transfers originating in the UK, the UK International Data Transfer Addendum (IDTA) is incorporated by reference, with Tables 1-3 completed by reference to this DPA and the SCCs, and Table 4 modifications: neither Party.

7.3 **Swiss Transfers.** For Restricted Transfers originating in Switzerland, references in the SCCs to "the Regulation" include the Swiss Federal Act on Data Protection (FADP), and the competent Supervisory Authority is the Swiss Federal Data Protection and Information Commissioner (FDPIC).

7.4 **Transfer Impact Assessment.** pharosIQ has conducted a transfer impact assessment for delivery of the Licensed Data to Customer's jurisdiction and will share a summary on reasonable request.

---

## 8. Security

8.1 **Technical and Organizational Measures.** Each Party shall implement and maintain appropriate technical and organizational measures to protect Personal Data against accidental or unlawful destruction, loss, alteration, unauthorized disclosure, or access, as further described in Schedule 2.

8.2 **Encryption in Transit.** pharosIQ shall deliver the Licensed Data via encrypted channels (TLS 1.2 or higher for SFTP/HTTPS, or equivalent) and, where applicable, using file-level encryption (PGP, AES-256, or equivalent).

8.3 **Delivery Authentication.** Customer shall provide pharosIQ with authorized recipient identifiers (SFTP credentials, public keys, S3 bucket ARNs, or equivalent) and shall promptly notify pharosIQ of any change.

---

## 9. Personal Data Breach Notification

9.1 **Notification.** Each Party shall notify the other Party without undue delay, and in any event within seventy-two (72) hours of becoming aware, of any Personal Data Breach affecting Personal Data licensed or received under this DPA.

9.2 **Content of Notification.** The notification shall include, to the extent known: the nature of the breach, categories and approximate number of Data Subjects and records concerned, likely consequences, and measures taken or proposed.

9.3 **Cooperation.** The Parties shall cooperate in good faith to investigate, mitigate, and remediate Personal Data Breaches, and to provide notifications required by Applicable Data Protection Law to Supervisory Authorities and affected Data Subjects.

---

## 10. Data Subject Rights and Cooperation

10.1 **Routing.** Where a Data Subject exercises rights against one Party with respect to Personal Data within the other Party's sole control, the receiving Party shall inform the Data Subject of the appropriate contact and shall reasonably cooperate with the other Party in responding.

10.2 **Suppression and Deletion.** pharosIQ maintains a global suppression list reflecting Data Subject deletion and opt-out requests processed by pharosIQ. pharosIQ shall make updated suppression lists available to Customer on the cadence specified in the Agreement, and Customer shall apply suppressions as set forth in Section 5.4.

---

## 11. Audit

11.1 **Right to Information.** On reasonable written request (and no more than once per twelve-month period absent a Personal Data Breach or regulatory demand), each Party shall provide the other with information reasonably necessary to demonstrate compliance with this DPA, including completed industry-standard security questionnaires (SIG Lite, CAIQ) and summaries of relevant third-party certifications (e.g., SOC 2 Type II, ISO 27001) where available.

11.2 **No On-Site Audits.** Given the Controller-to-Controller relationship and the nature of the flat file license, neither Party has an audit right of the other's premises or systems, except where expressly required by a Supervisory Authority or Applicable Data Protection Law and limited to the scope of that requirement.

---

## 12. Return or Deletion of Data

12.1 **Upon Termination.** On termination or expiration of the Agreement, and subject to the post-termination use rights (if any) expressly granted in the Agreement, Customer shall within {{DELETION_SLA_DAYS}} days cease all use of the Licensed Data and delete, destroy, or render inaccessible all copies in Customer's systems, except:
   (a) records Customer is legally required to retain;
   (b) backup copies that cannot be selectively deleted, provided Customer continues to treat such copies in accordance with this DPA and the Agreement until deletion;
   (c) de-identified or aggregated derivatives that do not constitute Personal Data and that were created during the term in compliance with the Agreement.

12.2 **Certification.** On pharosIQ's written request, Customer shall certify in writing its compliance with Section 12.1.

---

## 13. CCPA and US State Privacy Law Provisions

13.1 **Sale or Sharing Status.** The licensing of the Licensed Data from pharosIQ to Customer may constitute a "sale" or "sharing" of Personal Information under CCPA and equivalent US state privacy laws. Each Party is independently responsible for its own disclosures and consumer notices.

13.2 **No Customer Instructions.** Customer is not pharosIQ's "service provider" or "contractor" as defined under CCPA, and pharosIQ does not collect Personal Information on behalf of Customer.

13.3 **Sensitive Personal Information.** pharosIQ does not include Sensitive Personal Information as defined under CCPA in the Licensed Data unless expressly agreed.

13.4 **Consumer Requests.** Each Party shall independently handle consumer requests received directly by that Party, subject to cooperation obligations in Section 10.

---

## 14. General

14.1 **Term.** This DPA takes effect on the Effective Date and remains in effect for the term of the Agreement and any survival period required by Applicable Data Protection Law.

14.2 **Order of Precedence.** In the event of conflict: this DPA controls over the Agreement with respect to processing of Personal Data; the SCCs control over this DPA with respect to Restricted Transfers; Applicable Data Protection Law controls over all.

14.3 **Amendment.** This DPA may be amended only by a writing signed by both Parties, except that pharosIQ may update operational details (e.g., service-provider lists, privacy-notice URLs) by notice to Customer.

14.4 **Severability.** If any provision of this DPA is held invalid or unenforceable, the remaining provisions remain in full force.

14.5 **Governing Law.** This DPA is governed by the governing law of the Agreement, except that Restricted Transfers are governed as set forth in Section 7.

14.6 **Entire Agreement.** This DPA, together with the Agreement and any schedules and exhibits incorporated herein, constitutes the entire agreement between the Parties with respect to the subject matter hereof.

**IN WITNESS WHEREOF**, the Parties have executed this DPA as of the Effective Date.

| pharosIQ, LLC | {{CUSTOMER_LEGAL_NAME}} |
|---|---|
| By: _______________________ | By: _______________________ |
| Name: {{PHAROSIQ_SIGNATORY}} | Name: {{CUSTOMER_SIGNATORY}} |
| Title: {{PHAROSIQ_TITLE}} | Title: {{CUSTOMER_TITLE}} |
| Date: _______________________ | Date: _______________________ |

---

## Schedule 1 — Description of Transfer (SCC Annex I.B)

| Item | Description |
|---|---|
| **Categories of Data Subjects** | Business professionals acting in their professional capacity at commercial organizations. |
| **Categories of Personal Data** | Business contact fields: full name, business email, business phone, job title, job function, seniority, employer, business address, professional profile data. Where applicable: topic-level intent and engagement signals associated with professional or account identity. |
| **Special Categories of Data** | None. |
| **Frequency of Transfer** | {{FREQUENCY}} (e.g., one-time initial file, monthly refresh, weekly refresh). |
| **Nature of Processing** | License and delivery of a structured flat file for ingestion into Customer's sales, marketing, and analytics systems. |
| **Purpose of Processing** | B2B sales and marketing, ABM, lead enrichment, analytics and modeling, as permitted under the Agreement. |
| **Retention Period** | For the term of the Agreement plus any permitted post-termination use period, subject to Section 12. |

---

## Schedule 2 — Technical and Organizational Measures (SCC Annex II)

pharosIQ implements the following measures (representative; subject to update without reducing protection):

- **Access Control:** Role-based access, least-privilege, MFA for privileged accounts.
- **Encryption:** TLS 1.2+ in transit. AES-256 at rest. PGP/GPG for encrypted file delivery on request.
- **Network Security:** Segmented networks, intrusion detection, managed firewall.
- **Application Security:** Secure SDLC, code review, vulnerability scanning, annual penetration testing.
- **Personnel:** Background checks, confidentiality agreements, security training.
- **Physical Security:** SOC 2-compliant data center hosting via reputable cloud providers.
- **Business Continuity:** Backups, disaster recovery plan, documented incident response.
- **Data Minimization:** Delivery limited to fields contracted in the Agreement.
- **Audit Logging:** Access and transfer events logged and retained.
- **Sub-processor Management:** Written agreements, security reviews.

Customer shall maintain comparable measures with respect to the Licensed Data within its own systems, including encryption at rest, access controls, and logging.

---

*End of template. Before sending: (1) fill all {{PLACEHOLDERS}}, (2) confirm pharosIQ privacy notice URL and sub-processor URL are live, (3) route through pharosIQ legal for signature authority, (4) attach to the Data License Agreement as Exhibit {{X}}.*
