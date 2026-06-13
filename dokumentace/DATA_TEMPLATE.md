# Product Database Information Template

Please fill out the information below based on your existing Excel file and your business needs. This will help me accurately design the SQL schema and JSONB structures.

Language = czech

## 1. Main Product Categories
*List the high-level categories of materials you handle. (e.g., Carbon Fabrics, Resins, Prepregs, Consumables).*
- Vuztuzne materialy
- Prepregy
- Pryskyrice
- Sendvicove materialy
- Technicke materialy
- Strukturalni lepidla
- Brouseni a lesteni
- Cisteni
- Spojovaci material

## 2. Base Units
*List the units of measurement you use for inventory and sales. (e.g., m², kg, linear meters, rolls, pcs).*
- 
- 
- 

## 3. Existing Excel Columns
*Please list the column headers exactly as they appear in your current Excel sheet.*
1. 
2. 
3. 
4. 
5. 
*(Add more as needed)*

## 4. Specific Attributes by Category
*For each category you listed in Section 1, what specific information do you need to track?*

### Example: Fabrics
- Weave type (e.g., Twill, Plain)
- Areal weight (g/m²)
- Width (mm)

### Example: Resins
- Mix ratio
- Pot life (minutes)
- Cure temperature (°C)

### Your Categories:
*(Please add your specific attributes here)*
- 

## 5. Future Requirements (Optional)
*What information are you not tracking now, but wish to track in this new system? (e.g., supplier lead time, minimum order quantity, hazard class).*
- 
- 

This is how the templates look like in excel sheet currently

	Fabrics - Carbon Fiber				
	CF-WF-96-1K-T22(P11)-E				
Supplier Input	Dodavatel	HITEX			
	Země původu	Čína			
	Shelf life	24	měsíců		
	Splatnost faktury	0	dní		
					
	Doba doručení	21	dní		
	Celní tarif	0%			
	Dopravní tarif	41%			
	Množství jednotek	50.00	m2		
		Výchozí měna		Měna přep. kurzem	
COGS	Nákupní cena za jednotku	19.62	EUR/m2	475.94	CZK/m2
	Nákupní cena	981.00	EUR	23,797.18	CZK
	Cena dopravy za jednotku	8.04	EUR	195.14	CZK
	Cena doprava	402.21	EUR	9,756.84	CZK
	SWIFT OUR Bank Transfer fee	190.00	CZK	7.83	EUR
	SWIFT Poplatek ROKLEN	414.96	CZK	17.11	EUR
	Clo	0.00	CZK	0.00	EUR
	Poplatek za proclení	0.00	CZK	0.00	EUR
	Přijatý odpad poplatky	1.00	CZK	0.04	EUR
	Balení	100.00	CZK	4.12	EUR
	Balení odpad poplatky	1.00	CZK	0.04	EUR
Unit C&P	Pořizovací cena za jednotku	28.25	EUR/m2	685.22	CZK/m2
	Pořizovací cena	1,412.35	EUR	34,260.98	CZK
	Prodejní cena za jednotku	925.97	CZK/m2	38.17	EUR/m2
	Prodejní cena	46,298.62	CZK	1,908.59	EUR
Gross Margin	Marže Mean	26.00%	průměr pro rok		
	Marže EURO	26.00%			
	Marže High	28.77%	za pět let nejsilnější koruna		
	Marže Low	19.35%	za pět let nejslabší koruna		
	Marže aktuální	25.55%	Kurz danný den		




I want to add those: 

stav - readt to order/potreba stitky, test
Pocet tydnu do ready to order
Marze
Doba dodani
MOQ
Sklad nebo externe
Zeme puvodu
Kategorie (Separator apod.)
Label (Vlastni, white label, jejich)
Zpracovani pred odeslani (Potreba prebalit, nadelit nebo jen odeslat)
Jmeno dodavatele
Shelf life
Platebni podminky
Velikost baleni
Hmotnost baliku

