import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { Product } from '@/modules/products/types';
import { PricingBreakdown } from '@/modules/finance/utils/calculations';

// Register Roboto font to support Czech diacritics (served locally)
Font.register({
  family: 'Roboto',
  fonts: [
    { src: '/fonts/Roboto-Regular.ttf' },
    { src: '/fonts/Roboto-Bold.ttf', fontWeight: 'bold' }
  ]
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Roboto',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    position: 'relative',
    width: '100%',
    height: 55, // Calculated based on image aspect ratio of ~10.26 (535pt width / 10.26 ≈ 52pt) plus small buffer
    marginBottom: 20,
  },
  headerImage: {
    position: 'absolute',
    top: -15, // Move the template image higher up into padding area
    left: 0,
    width: '100%',
    height: 52,
  },
  headerTextContainer: {
    position: 'absolute',
    top: 12, // Position text block cleanly below the purple line
    right: 15,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#8A0485', // Brand primary color
  },
  infoText: {
    fontSize: 8,
    color: '#666666',
    marginTop: 2,
  },
  infoTextSmall: {
    fontSize: 7,
    color: '#888888',
    marginTop: 1,
  },
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableColHeaderSku: {
    width: '23%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#f4f4f5',
    padding: 6,
  },
  tableColHeaderName: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#f4f4f5',
    padding: 6,
  },
  tableColHeaderUnitPrice: {
    width: '19%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#f4f4f5',
    padding: 6,
  },
  tableColHeaderUnitCount: {
    width: '10%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#f4f4f5',
    padding: 6,
  },
  tableColHeaderTotalPrice: {
    width: '13%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#f4f4f5',
    padding: 6,
  },
  tableColHeaderPackSize: {
    width: '10%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#f4f4f5',
    padding: 6,
  },
  tableColSku: {
    width: '23%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 6,
  },
  tableColName: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 6,
  },
  tableColUnitPrice: {
    width: '19%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 6,
  },
  tableColUnitCount: {
    width: '10%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 6,
  },
  tableColTotalPrice: {
    width: '13%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 6,
  },
  tableColPackSize: {
    width: '10%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 6,
  },
  tableCellHeader: {
    margin: 'auto',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#18181b',
  },
  tableCell: {
    margin: 'auto',
    fontSize: 8,
    color: '#3f3f46',
  },
  tableCellSku: {
    margin: 'auto',
    fontSize: 7,
    color: '#3f3f46',
  },
  tableCellName: {
    fontSize: 8,
    color: '#3f3f46',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#a1a1aa',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
    paddingTop: 10,
  }
});

interface PricedProduct extends Product {
  pricing: PricingBreakdown | null
}

interface CatalogPDFProps {
  products: PricedProduct[];
  tier: "retail" | "partner" | "partner_5" | "partner_10" | "partner_15" | "partner_20";
  targetCurrency: "CZK" | "EUR" | "USD";
  exchangeRate: number;
}

export const CatalogPDF = ({ products, tier, targetCurrency, exchangeRate }: CatalogPDFProps) => {
  
  const getTierLabel = () => {
    switch (tier) {
      case 'retail': return 'Maloobchodní nabídka';
      case 'partner': return 'Velkoobchodní nabídka';
      case 'partner_5': return 'Velkoobchodní nabídka (sleva 5 %)';
      case 'partner_10': return 'Velkoobchodní nabídka (sleva 10 %)';
      case 'partner_15': return 'Velkoobchodní nabídka (sleva 15 %)';
      case 'partner_20': return 'Velkoobchodní nabídka (sleva 20 %)';
      default: return 'Produktová nabídka';
    }
  };

  const formatSkuForPdf = (sku: string) => {
    if (!sku) return '';
    return sku.replace(/-/g, '-\u200B');
  };

  const getNumericPrice = (pr: PricingBreakdown | null) => {
    if (!pr) return 0;
    let price = 0;
    if (tier === 'retail') price = pr.b2cUnitPrice;
    else if (tier === 'partner') price = pr.b2bUnitPrice;
    else if (tier === 'partner_5') price = pr.b2bDiscountedPrices[5];
    else if (tier === 'partner_10') price = pr.b2bDiscountedPrices[10];
    else if (tier === 'partner_15') price = pr.b2bDiscountedPrices[15];
    else if (tier === 'partner_20') price = pr.b2bDiscountedPrices[20];
    
    if (targetCurrency !== 'CZK') {
      price = price / exchangeRate;
    }
    return price;
  };

  const today = new Date().toLocaleDateString('cs-CZ');

  // Seskupíme produkty podle kategorií, aby PDF vypadalo profesionálně
  const groupedProducts = products.reduce((acc, p) => {
    const cat = p.c_kategorie?.nazev || 'Nezarazeno';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {} as Record<string, PricedProduct[]>);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Branding Hlavička */}
        <View style={styles.headerContainer}>
          <Image src="/brand/katalog-hlavicka.png" style={styles.headerImage} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>{getTierLabel()}</Text>
            <Text style={styles.infoText}>Platnost k: {today} | Měna: {targetCurrency}</Text>
            <Text style={styles.infoTextSmall}>Ceník má platnost 14 dní od tohoto data</Text>
          </View>
        </View>

        {/* Tabulky podle kategorií */}
        {Object.entries(groupedProducts).map(([catName, catProducts]) => (
          <View key={catName} style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#8A0485', marginBottom: 10, marginTop: 10 }}>
              {catName}
            </Text>

            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.tableRow}>
                <View style={styles.tableColHeaderName}>
                  <Text style={styles.tableCellHeader}>Název</Text>
                </View>
                <View style={styles.tableColHeaderSku}>
                  <Text style={styles.tableCellHeader}>Číslo produktu</Text>
                </View>
                <View style={styles.tableColHeaderUnitPrice}>
                  <Text style={styles.tableCellHeader}>Cena za jednotku</Text>
                </View>
                <View style={styles.tableColHeaderUnitCount}>
                  <Text style={styles.tableCellHeader}>Počet jednotek</Text>
                </View>
                <View style={styles.tableColHeaderTotalPrice}>
                  <Text style={styles.tableCellHeader}>Celková cena</Text>
                </View>
                <View style={styles.tableColHeaderPackSize}>
                  <Text style={styles.tableCellHeader}>Velikost balení</Text>
                </View>
              </View>

              {/* Table Body */}
              {catProducts.map((p) => {
                const pricePerUnit = getNumericPrice(p.pricing);
                const qtyInPack = p.mnozstvi_v_baleni || 1;
                const totalPriceVal = pricePerUnit * qtyInPack;
                const unitAbbr = p.c_merne_jednotky_zakladni?.zkratka || '';
                const packAbbr = p.c_merne_jednotky_baleni?.zkratka || 'bal.';

                return (
                  <View style={styles.tableRow} key={p.id}>
                    <View style={styles.tableColName}>
                      <Text style={styles.tableCellName}>{p.nazev}</Text>
                    </View>
                    <View style={styles.tableColSku}>
                      <Text style={styles.tableCellSku}>{formatSkuForPdf(p.sku)}</Text>
                    </View>
                    <View style={styles.tableColUnitPrice}>
                      <Text style={styles.tableCell}>
                        {pricePerUnit > 0 ? `${pricePerUnit.toFixed(2)} ${targetCurrency} / ${unitAbbr}` : "Na dotaz"}
                      </Text>
                    </View>
                    <View style={styles.tableColUnitCount}>
                      <Text style={styles.tableCell}>{`${qtyInPack} ${unitAbbr}`}</Text>
                    </View>
                    <View style={styles.tableColTotalPrice}>
                      <Text style={{ ...styles.tableCell, fontWeight: 'bold' }}>
                        {pricePerUnit > 0 ? `${totalPriceVal.toFixed(2)} ${targetCurrency}` : "Na dotaz"}
                      </Text>
                    </View>
                    <View style={styles.tableColPackSize}>
                      <Text style={styles.tableCell}>{`1 ${packAbbr}`}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {/* Patička */}
        <View style={styles.footer}>
          <Text>AZ-Composites s.r.o. | Všechny uvedené ceny jsou bez DPH a nezahrnují finální dopravu ke klientovi.</Text>
        </View>
      </Page>
    </Document>
  );
};
