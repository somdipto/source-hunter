# source hunter demo

claim: "UPI processed over 18 billion transactions in a month in India"
seen on: n/a
research run: 01a1ce9f-897a-7491-84a1-a754777eaa8a

## verdict: matches original

The claim traces cleanly from secondary media reporting → PIB Backgrounder → IMF Fintech Note → NPCI product statistics, with consistent wording ('more than 18 billion transactions per month') at every step; the only variation is that the PIB Backgrounder specifies the June 2025 figure as 18.39 billion while the IMF note (based on March 2025 NPCI data) uses the rounded 'more than 18 billion' form.

## chain

1. [UPI surge: India leads the world in fast payments; 18 billion monthly transactions power growth - Times of India](https://timesofindia.indiatimes.com/business/india-business/upi-surge-india-leads-the-world-in-fast-payments-18-billion-monthly-transactions-power-growth/articleshow/122797610.cms) - 2025-07-21 (fetch-confirmed live)
   > "According to data from the Press Information Bureau (PIB), UPI now processes over 18 billion transactions every month, accounting for 85 per cent of India's total digital payments."
2. [PIB Backgrounder](https://www.pib.gov.in/PressNoteDetails.aspx?NoteId=154912&ModuleId=3) - 2025-07-21 (fetch-confirmed live)
   > "Today, UPI processes over 18 billion transactions every month in India. / In June 2025 alone, it handled over ₹24.03 lakh crore in payments. This was spread across 18.39 billion transactions."
   - changed here: PIB cites both the IMF note and NPCI as references; it rounds to 'over 18 billion' for the headline and gives the precise June 2025 figure (18.39 billion) separately. PIB is a government communicator, not the originating data authority.
3. [Growing Retail Digital Payments: The Value of Interoperability (IMF Fintech Note)](https://www.imf.org/-/media/files/publications/ftn063/2025/english/ftnea2025004.pdf) - 2025-07 (fetch-confirmed live)
   > "UPI now processes more than 18 billion transactions per month and dominates other electronic retail payments in India. [footnote: UPI volume as of March 2025; see NPCI statistics here.]"
   - changed here: The IMF note is the analytical intermediary; it derives the 'more than 18 billion' figure from NPCI product statistics as of March 2025 and cites NPCI explicitly in a footnote, but does not independently collect the data.
4. [Unified Payments Interface (UPI) Product Statistics | NPCI](https://www.npci.org.in/product/upi/product-statistics) - ongoing (March 2025 data cited by IMF; page currently shows through October 2026) - PRIMARY SOURCE
   > "| October-2026 | 758 | 25,466.70 | 31,52,929.46 | [monthly table; March 2025 row, per IMF footnote, is the basis for the '18 billion' figure]"

## searched but not found

- https://www.pib.gov.in/PressReleasePage.aspx?PRID=2200569&lang=1&reg=3 — PIB Lok Sabha written reply (08 Dec 2025) does not mention the 18 billion monthly transaction figure at all
- https://www.pib.gov.in/PressReleasePage.aspx?PRID=2257087 — PIB 10-year UPI anniversary release does not use the '18 billion in a month' claim; it references 2,001 crore (≈20 billion) for August 2025 as the first month crossing 2,000 crore
- https://elearn.legacyias.com/posts/pib-summaries-21-july-2025/ — third-party PIB summary site; reproduces the 18.39 billion June 2025 figure but does not quote the original PIB or IMF wording exactly and does not add a traceable citation link

built with TinyFish endpoints: research (deep run), fetch (live-check), search (citer backfill)
