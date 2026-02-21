import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

export default function ExposureChart({ contracts, variation }) {
  const labels = (contracts || []).map((c, i) => `C${i + 1}`);
  const original = (contracts || []).map((c) => Number(c.notional || 0));
  const projected = (contracts || []).map((c) => Number(c.notional || 0) * (1 + variation / 100));

  const data = {
    labels,
    datasets: [
      { label: "Original", data: original, borderColor: "#4aa3ff", tension: 0.35 },
      { label: "Projetado", data: projected, borderColor: "#00ff99", tension: 0.35 }
    ]
  };

  const options = {
    responsive: true,
    plugins: { legend: { labels: { color: "#dbeafe" } } },
    scales: {
      x: { ticks: { color: "#9fb3c8" }, grid: { color: "rgba(255,255,255,0.06)" } },
      y: { ticks: { color: "#9fb3c8" }, grid: { color: "rgba(255,255,255,0.06)" } }
    }
  };

  return <Line data={data} options={options} />;
}
