import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import type { TripRow } from "@/lib/data/types";

// Domyślne fonty @react-pdf/renderer (Helvetica) nie obsługują polskich znaków
// diakrytycznych (ą, ć, ę, ł, ń, ó, ś, ź, ż) — bez rejestracji własnego fontu
// wychodzi "krzaki". Noto Sans w wariancie latin+latin-ext pokrywa je w całości.
Font.register({
  family: "Noto Sans",
  fonts: [
    { src: "https://fonts.gstatic.com/s/notosans/v42/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A-9U6VfYz2tZ.ttf" },
    {
      src: "https://fonts.gstatic.com/s/notosans/v42/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyAaBO9U6VfYz2tZ.ttf",
      fontWeight: 700,
    },
  ],
});

const BORDER_COLOR = "#999";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 8, fontFamily: "Noto Sans" },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 9, color: "#333", marginBottom: 2 },
  meta: { fontSize: 9, color: "#333", marginBottom: 10 },
  table: { borderWidth: 1, borderColor: BORDER_COLOR },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#e8e8e8",
    fontWeight: 700,
  },
  row: { flexDirection: "row", borderTopWidth: 1, borderTopColor: BORDER_COLOR },
  cell: {
    padding: 4,
    borderLeftWidth: 1,
    borderLeftColor: BORDER_COLOR,
  },
  cellFirst: { padding: 4 },
  cellNr: { width: "5%" },
  cellData: { width: "8%" },
  cellTrasa: { width: "26%" },
  cellCel: { width: "31%" },
  cellKm: { width: "8%", textAlign: "right" },
  cellKierowca: { width: "22%" },
  total: { marginTop: 12, fontSize: 11, fontWeight: 700, textAlign: "right" },
  footer: { marginTop: 16, fontSize: 8, color: "#888" },
});

export interface ReportDocumentProps {
  companyName: string;
  companyNip: string;
  nrRejestracyjny: string;
  dataRozpoczeciaEwidencji: string | null;
  zakresOd: string;
  zakresDo: string;
  trips: TripRow[];
  sumaKm: number;
  stanPoczatkowy: number | null;
  stanKoncowy: number | null;
  zatwierdzoneInfo?: string | null;
}

export function ReportDocument(props: ReportDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Ewidencja przebiegu pojazdu</Text>
        <Text style={styles.subtitle}>
          {props.companyName} · NIP {props.companyNip}
        </Text>
        <Text style={styles.subtitle}>Numer rejestracyjny pojazdu: {props.nrRejestracyjny}</Text>
        {props.dataRozpoczeciaEwidencji && (
          <Text style={styles.subtitle}>Data rozpoczęcia ewidencji: {props.dataRozpoczeciaEwidencji}</Text>
        )}
        <Text style={styles.meta}>
          Zakres: {props.zakresOd} – {props.zakresDo}
          {props.stanPoczatkowy !== null && ` · Stan licznika na początek: ${props.stanPoczatkowy} km`}
          {props.stanKoncowy !== null && ` · Stan licznika na koniec: ${props.stanKoncowy} km`}
        </Text>

        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.cellFirst, styles.cellNr]}>Nr</Text>
            <Text style={[styles.cell, styles.cellData]}>Data</Text>
            <Text style={[styles.cell, styles.cellTrasa]}>Trasa (skąd–dokąd)</Text>
            <Text style={[styles.cell, styles.cellCel]}>Cel wyjazdu</Text>
            <Text style={[styles.cell, styles.cellKm]}>Km</Text>
            <Text style={[styles.cell, styles.cellKierowca]}>Kierowca</Text>
          </View>

          {props.trips.map((t) => (
            <View style={styles.row} key={t.id}>
              <Text style={[styles.cellFirst, styles.cellNr]}>{t.numer_wpisu}</Text>
              <Text style={[styles.cell, styles.cellData]}>{t.data}</Text>
              <Text style={[styles.cell, styles.cellTrasa]}>
                {t.skad} – {t.dokad}
              </Text>
              <Text style={[styles.cell, styles.cellCel]}>{t.cel}</Text>
              <Text style={[styles.cell, styles.cellKm]}>{Number(t.km).toFixed(1)}</Text>
              <Text style={[styles.cell, styles.cellKierowca]}>{t.kierowca}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.total}>Suma kilometrów: {props.sumaKm.toFixed(1)} km</Text>

        {props.zatwierdzoneInfo && <Text style={styles.footer}>{props.zatwierdzoneInfo}</Text>}
        <Text style={styles.footer}>Ewidencja przebiegu pojazdu — wygenerowano automatycznie.</Text>
      </Page>
    </Document>
  );
}
