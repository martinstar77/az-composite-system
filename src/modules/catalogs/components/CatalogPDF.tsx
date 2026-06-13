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
  tableColHeader: {
    width: '20%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#f4f4f5',
    padding: 6,
  },
  tableColHeaderName: {
    width: '40%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#f4f4f5',
    padding: 6,
  },
  tableCol: {
    width: '20%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 6,
  },
  tableColName: {
    width: '40%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 6,
  },
  tableCellHeader: {
    margin: 'auto',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#18181b',
  },
  tableCell: {
    margin: 'auto',
    fontSize: 9,
    color: '#3f3f46',
  },
  tableCellName: {
    fontSize: 9,
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
  tier: "retail" | "partner" | "vip" | "premarket_open";
  targetCurrency: "CZK" | "EUR" | "USD";
  exchangeRate: number;
}

export const CatalogPDF = ({ products, tier, targetCurrency, exchangeRate }: CatalogPDFProps) => {
  
  const getPrice = (pr: PricingBreakdown | null) => {
    if (!pr) return "Na dotaz";
    let price = 0;
    if (tier === 'retail') price = pr.retailUnitPrice;
    else if (tier === 'partner') price = pr.partnerUnitPrice;
    else if (tier === 'vip') price = pr.vipUnitPrice;
    else if (tier === 'premarket_open') price = pr.premarketOpenUnitPrice;
    
    if (targetCurrency !== 'CZK') {
      price = price / exchangeRate;
    }
    return `${price.toFixed(2)} ${targetCurrency}`;
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
            <Text style={styles.title}>B2B Ceník produktů</Text>
            <Text style={styles.infoText}>Platnost k: {today}</Text>
            <Text style={styles.infoText}>Výchozí měna: {targetCurrency}</Text>
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
                <View style={styles.tableColHeader}>
                  <Text style={styles.tableCellHeader}>SKU</Text>
                </View>
                <View style={styles.tableColHeaderName}>
                  <Text style={styles.tableCellHeader}>Název produktu</Text>
                </View>
                <View style={styles.tableColHeader}>
                  <Text style={styles.tableCellHeader}>Měrná jedn.</Text>
                </View>
                <View style={styles.tableColHeader}>
                  <Text style={styles.tableCellHeader}>Cena za MJ</Text>
                </View>
              </View>

              {/* Table Body */}
              {catProducts.map((p) => (
                <View style={styles.tableRow} key={p.id}>
                  <View style={styles.tableCol}>
                    <Text style={styles.tableCell}>{p.sku}</Text>
                  </View>
                  <View style={styles.tableColName}>
                    <Text style={styles.tableCellName}>{p.nazev}</Text>
                  </View>
                  <View style={styles.tableCol}>
                    <Text style={styles.tableCell}>{p.c_merne_jednotky_zakladni?.zkratka || '-'}</Text>
                  </View>
                  <View style={styles.tableCol}>
                    <Text style={{ ...styles.tableCell, fontWeight: 'bold' }}>{getPrice(p.pricing)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Patička */}
        <View style={styles.footer}>
          <Text>AZ-Composites s.r.o. | Všechny uvedené ceny jsou bez DPH a nezahrnují finální dopravu ke klientovi.</Text>
          <Text>Tento ceník byl automaticky vygenerován systémem AZ-ERP dne {today}.</Text>
        </View>
      </Page>
    </Document>
  );
};
