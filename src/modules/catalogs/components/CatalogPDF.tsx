import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Product } from '@/modules/products/types';
import { PricingBreakdown } from '@/modules/finance/utils/calculations';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#8A0485', // AZ-Composites Primary Color
    paddingBottom: 10,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8A0485',
  },
  title: {
    fontSize: 16,
    color: '#333333',
  },
  infoText: {
    fontSize: 10,
    color: '#666666',
    marginTop: 4,
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
    width: '15%',
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
    width: '20%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#f4f4f5',
    padding: 6,
  },
  tableColHeaderUnitCount: {
    width: '13%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#f4f4f5',
    padding: 6,
  },
  tableColHeaderTotalPrice: {
    width: '17%',
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
    width: '15%',
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
    width: '20%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 6,
  },
  tableColUnitCount: {
    width: '13%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 6,
  },
  tableColTotalPrice: {
    width: '17%',
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
      case 'retail': return 'Maloobchodní ceník (B2C)';
      case 'partner': return 'Základní partnerský ceník (B2B)';
      case 'partner_5': return 'Partnerský ceník B2B (sleva 5 %)';
      case 'partner_10': return 'Partnerský ceník B2B (sleva 10 %)';
      case 'partner_15': return 'Partnerský ceník B2B (sleva 15 %)';
      case 'partner_20': return 'Partnerský ceník B2B (sleva 20 %)';
      default: return 'Ceník produktů';
    }
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
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>AZ-COMPOSITES</Text>
            <Text style={styles.infoText}>Profesionální materiály</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.title}>{getTierLabel()}</Text>
            <Text style={styles.infoText}>Platnost k: {today}</Text>
            <Text style={styles.infoText}>Ceník má platnost 14 dní od tohoto data</Text>
            <Text style={styles.infoText}>Měna: {targetCurrency}</Text>
          </View>
        </View>

        {/* Tabulky podle kategorií */}
        {Object.entries(groupedProducts).map(([catName, catProducts]) => (
          <View key={catName} style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#8A0485', marginBottom: 10, marginTop: 10 }}>
              Kategorie: {catName}
            </Text>

            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.tableRow}>
                <View style={styles.tableColHeaderSku}>
                  <Text style={styles.tableCellHeader}>Číslo produktu</Text>
                </View>
                <View style={styles.tableColHeaderName}>
                  <Text style={styles.tableCellHeader}>Název</Text>
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
                    <View style={styles.tableColSku}>
                      <Text style={styles.tableCell}>{p.sku}</Text>
                    </View>
                    <View style={styles.tableColName}>
                      <Text style={styles.tableCellName}>{p.nazev}</Text>
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
