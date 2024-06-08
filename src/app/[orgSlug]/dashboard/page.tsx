import DestinationsTable from "../_components/destinations";
import EndpointsTable from "../_components/endpoints";

export default function Page() {
  return (
    <div className="p-2">
      {/* <h1 className="px-2 text-2xl font-bold">Dashboard</h1> */}
      <div className="flex h-svh flex-col gap-2">
        <EndpointsTable />
        <DestinationsTable />
      </div>
    </div>
  );
}
