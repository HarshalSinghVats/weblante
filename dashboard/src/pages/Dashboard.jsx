import SummaryCards from "../components/SummaryCards";
import ActivityTable from "../components/ActivityTable";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-900 p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-semibold mb-4 text-white">
        Weblante – Parent Dashboard
      </h1>

      <SummaryCards />
      <ActivityTable />
    </div>
  );
}
