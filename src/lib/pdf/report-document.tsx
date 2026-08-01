import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { TripRow } from "@/lib/data/types";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 8 },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 9, color: "#333", marginBottom: 2 },
  meta: { fontSize: 9, color: "#333", marginBottom: 10 },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#333",
    paddingBottom: 4,
    fontWeight: 700,
  },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ddd", paddingVertical: 3 },
  cellNr: { width: "5%" },
  cellData: { width: "9%" },
  cellTrasa: { width: "28%" },
  cellCel: { width: "33%" },
  cellKm: { width: "8%", textAlign: "right" },
  cellKierowca: { width: "17%" },
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

        <View style={styles.headerRow}>
          <Text style={styles.cellNr}>Nr</Text>
          <Text style={styles.cellData}>Data</Text>
          <Text style={styles.cellTrasa}>Trasa (skąd–dokąd)</Text>
          <Text style={styles.cellCel}>Cel wyjazdu</Text>
          <Text style={styles.cellKm}>Km</Text>
          <Text style={styles.cellKierowca}>Kierowca</Text>
        </View>

        {props.trips.map((t) => (
          <View style={styles.row} key={t.id}>
            <Text style={styles.cellNr}>{t.numer_wpisu}</Text>
            <Text style={styles.cellData}>{t.data}</Text>
            <Text style={styles.cellTrasa}>
              {t.skad} – {t.dokad}
            </Text>
            <Text style={styles.cellCel}>{t.cel}</Text>
            <Text style={styles.cellKm}>{Number(t.km).toFixed(1)}</Text>
            <Text style={styles.cellKierowca}>{t.kierowca}</Text>
          </View>
        ))}

        <Text style={styles.total}>Suma kilometrów: {props.sumaKm.toFixed(1)} km</Text>

        {props.zatwierdzoneInfo && <Text style={styles.footer}>{props.zatwierdzoneInfo}</Text>}
        <Text style={styles.footer}>Ewidencja przebiegu pojazdu — wygenerowano automatycznie.</Text>
      </Page>
    </Document>
  );
}
