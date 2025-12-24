import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, Building2, Users, DollarSign, AlertTriangle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { formatKES } from "@shared/currency";

export default function GlobalOverview() {
  const { data: properties } = trpc.properties.list.useQuery() || { data: [] };
  const { data: units } = trpc.units.list.useQuery() || { data: [] };
  const { data: leases } = trpc.leases.list.useQuery() || { data: [] };
  const { data: invoices } = trpc.invoices.list.useQuery() || { data: [] };
  const { data: payments } = trpc.payments.list.useQuery() || { data: [] };

  // Calculate portfolio metrics
  const calculatePortfolioMetrics = () => {
    const totalProperties = properties?.length || 0;
    const totalUnits = units?.length || 0;
    const occupiedUnits = units?.filter(u => u.status === "occupied").length || 0;
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    const activeLeases = leases?.filter(l => l.status === "active").length || 0;
    const totalProjectedIncome = leases?.reduce((sum, lease) => {
      if (lease.status === "active") {
        return sum + parseFloat(lease.monthlyRent);
      }
      return sum;
    }, 0) || 0;

    const totalInvoiced = invoices?.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0) || 0;
    const totalPaid = payments?.reduce((sum, pay) => sum + parseFloat(pay.amount), 0) || 0;
    const totalArrears = totalInvoiced - totalPaid;

    const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

    return {
      totalProperties,
      totalUnits,
      occupiedUnits,
      occupancyRate,
      activeLeases,
      totalProjectedIncome,
      totalInvoiced,
      totalPaid,
      totalArrears,
      collectionRate,
    };
  };

  // Calculate property-level metrics
  const calculatePropertyMetrics = () => {
    return properties?.map((property) => {
      const propertyUnits = units?.filter(u => u.propertyId === property.id) || [];
      const occupiedCount = propertyUnits.filter(u => u.status === "occupied").length;
      const occupancyRate = propertyUnits.length > 0 ? (occupiedCount / propertyUnits.length) * 100 : 0;

      const propertyLeases = leases?.filter(l => {
        const unit = units?.find(u => u.id === l.unitId);
        return unit?.propertyId === property.id && l.status === "active";
      }) || [];

      const propertyIncome = propertyLeases.reduce((sum, lease) => sum + parseFloat(lease.monthlyRent), 0);
      const propertyInvoices = invoices?.filter(inv => {
        const lease = leases?.find(l => l.id === inv.leaseId);
        const unit = units?.find(u => u.id === lease?.unitId);
        return unit?.propertyId === property.id;
      }) || [];

      const propertyArrears = propertyInvoices.reduce((sum, inv) => {
        if (inv.status === "unpaid" || inv.status === "partially_paid") {
          return sum + (parseFloat(inv.totalAmount) - parseFloat(inv.paidAmount));
        }
        return sum;
      }, 0);

      return {
        name: property.name,
        units: propertyUnits.length,
        occupied: occupiedCount,
        occupancyRate: occupancyRate.toFixed(1),
        income: propertyIncome,
        arrears: propertyArrears,
      };
    }) || [];
  };

  // Calculate income trend (last 6 months)
  const calculateIncomeTrend = () => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleString("default", { month: "short" });
      
      const monthPayments = payments?.filter(p => {
        const paymentDate = new Date(p.paymentDate);
        return paymentDate.getMonth() === date.getMonth() && paymentDate.getFullYear() === date.getFullYear();
      }) || [];

      const monthIncome = monthPayments.reduce((sum, pay) => sum + parseFloat(pay.amount), 0);

      months.push({
        month: monthName,
        income: monthIncome,
      });
    }
    return months;
  };

  // Calculate occupancy by unit type
  const calculateOccupancyByType = () => {
    const types = ["bedsitter", "1BR", "2BR", "shop"];
    return types.map((type) => {
      const typeUnits = units?.filter(u => u.unitType === type) || [];
      const occupiedCount = typeUnits.filter(u => u.status === "occupied").length;
      return {
        name: type,
        occupied: occupiedCount,
        vacant: typeUnits.length - occupiedCount,
      };
    });
  };

  const metrics = calculatePortfolioMetrics();
  const propertyMetrics = calculatePropertyMetrics();
  const incomeTrend = calculateIncomeTrend();
  const occupancyByType = calculateOccupancyByType();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Global Overview</h1>
          <p className="text-muted-foreground mt-1">Consolidated view of your entire rental portfolio</p>
        </div>

        {/* Portfolio Summary Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Properties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalProperties}</div>
              <p className="text-xs text-muted-foreground mt-1">Total properties</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Units</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalUnits}</div>
              <p className="text-xs text-muted-foreground mt-1">{metrics.occupiedUnits} occupied</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.occupancyRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">Portfolio-wide</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Projected Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatKES(metrics.totalProjectedIncome)}</div>
              <p className="text-xs text-muted-foreground mt-1">Monthly</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Total Arrears
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatKES(metrics.totalArrears)}</div>
              <p className="text-xs text-muted-foreground mt-1">Outstanding</p>
            </CardContent>
          </Card>
        </div>

        {/* Income Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Income Trend</CardTitle>
            <CardDescription>Last 6 months of collected payments</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={incomeTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatKES(value as number)} />
                <Line type="monotone" dataKey="income" stroke="#1e3a8a" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Property Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Property Performance Comparison</CardTitle>
            <CardDescription>Occupancy and arrears by property</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={propertyMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" label={{ value: "Occupancy %", angle: -90, position: "insideLeft" }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: "Arrears (KSh)", angle: 90, position: "insideRight" }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="occupancyRate" fill="#22c55e" name="Occupancy %" />
                <Bar yAxisId="right" dataKey="arrears" fill="#ef4444" name="Arrears" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Occupancy by Unit Type */}
        <Card>
          <CardHeader>
            <CardTitle>Occupancy by Unit Type</CardTitle>
            <CardDescription>Distribution of occupied and vacant units</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={occupancyByType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="occupied" fill="#22c55e" name="Occupied" />
                <Bar dataKey="vacant" fill="#ef4444" name="Vacant" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Collection Rate */}
        <Card>
          <CardHeader>
            <CardTitle>Collection Metrics</CardTitle>
            <CardDescription>Payment collection performance</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Invoiced</p>
              <p className="text-2xl font-bold">{formatKES(metrics.totalInvoiced)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Collected</p>
              <p className="text-2xl font-bold text-green-600">{formatKES(metrics.totalPaid)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Collection Rate</p>
              <p className="text-2xl font-bold">{metrics.collectionRate.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
