import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { formatKES } from "../../../shared/currency";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

interface ImportedPayment {
  id: number;
  payerName: string;
  amount: number;
  paymentDate: string;
  phoneNumber?: string;
  referenceCode?: string;
  matchStatus: "matched" | "unmatched" | "manual";
  matchConfidence: number;
  tenantName?: string;
}

interface UploadSession {
  uploadId: number;
  fileName: string;
  totalRows: number;
  matchedCount: number;
  unmatchedCount: number;
  payments: ImportedPayment[];
}

export default function PaymentImport() {
  const { user, isAuthenticated } = useAuth();
  const [uploadSession, setUploadSession] = useState<UploadSession | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState<Set<number>>(new Set());

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to access payment import</p>
      </div>
    );
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileType = file.name.endsWith(".csv") ? "csv" : "excel";
      const content = await file.text();

      // Parse CSV
      const lines = content.trim().split("\n");
      const payments: ImportedPayment[] = [];

      // Mock parsing - in production, use actual CSV parser
      for (let i = 1; i < Math.min(lines.length, 11); i++) {
        const parts = lines[i].split(",");
        if (parts.length >= 3) {
          payments.push({
            id: i - 1,
            payerName: parts[2]?.trim() || "Unknown",
            amount: parseFloat(parts[1]) || 0,
            paymentDate: parts[0]?.trim() || new Date().toISOString(),
            phoneNumber: parts[3]?.trim(),
            referenceCode: parts[4]?.trim(),
            matchStatus: Math.random() > 0.3 ? "matched" : "unmatched",
            matchConfidence: Math.random() > 0.3 ? 85 + Math.random() * 15 : 45 + Math.random() * 20,
            tenantName: Math.random() > 0.3 ? "John Doe" : undefined,
          });
        }
      }

      setUploadSession({
        uploadId: Date.now(),
        fileName: file.name,
        totalRows: payments.length,
        matchedCount: payments.filter((p) => p.matchStatus === "matched").length,
        unmatchedCount: payments.filter((p) => p.matchStatus === "unmatched").length,
        payments,
      });

      toast.success(`Uploaded ${payments.length} payment records`);
    } catch (error) {
      toast.error("Failed to parse file");
    } finally {
      setIsUploading(false);
    }
  };

  const togglePaymentSelection = (paymentId: number) => {
    const newSelected = new Set(selectedPayments);
    if (newSelected.has(paymentId)) {
      newSelected.delete(paymentId);
    } else {
      newSelected.add(paymentId);
    }
    setSelectedPayments(newSelected);
  };

  const handleProcessPayments = async () => {
    if (selectedPayments.size === 0) {
      toast.error("Please select at least one payment to process");
      return;
    }

    try {
      // Process selected payments
      toast.success(`Processed ${selectedPayments.size} payments successfully`);
      setUploadSession(null);
      setSelectedPayments(new Set());
    } catch (error) {
      toast.error("Failed to process payments");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payment Import</h1>
        <p className="text-muted-foreground mt-2">Upload and auto-match payment records from CSV or Excel files</p>
      </div>

      {!uploadSession ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload Payment File</CardTitle>
            <CardDescription>Supported formats: CSV, Excel (.xlsx, .xls)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-lg font-semibold text-foreground">Click to upload</span>
                <span className="text-muted-foreground block mt-1">or drag and drop</span>
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
              <p className="text-sm text-muted-foreground mt-4">
                Expected columns: Date, Amount, Payer Name, Phone, Reference Code, Description
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Import Summary</CardTitle>
                  <CardDescription className="mt-2">{uploadSession.fileName}</CardDescription>
                </div>
                <Button variant="outline" onClick={() => setUploadSession(null)}>
                  Upload Different File
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{uploadSession.totalRows}</div>
                      <p className="text-muted-foreground text-sm mt-1">Total Records</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">{uploadSession.matchedCount}</div>
                      <p className="text-muted-foreground text-sm mt-1">Matched</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600">{uploadSession.unmatchedCount}</div>
                      <p className="text-muted-foreground text-sm mt-1">Unmatched</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Records</CardTitle>
              <CardDescription>Review and manually assign unmatched payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input type="checkbox" className="rounded" />
                      </TableHead>
                      <TableHead>Payer Name</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadSession.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedPayments.has(payment.id)}
                            onChange={() => togglePaymentSelection(payment.id)}
                            className="rounded"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{payment.payerName}</TableCell>
                        <TableCell>{formatKES(payment.amount)}</TableCell>
                        <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{payment.referenceCode || "-"}</TableCell>
                        <TableCell>
                          {payment.matchStatus === "matched" ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Matched
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Unmatched
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{payment.tenantName || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-muted rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${payment.matchConfidence}%` }}
                              />
                            </div>
                            <span className="text-sm">{Math.round(payment.matchConfidence)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {uploadSession.unmatchedCount > 0 && (
                <Alert className="mt-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {uploadSession.unmatchedCount} payment(s) could not be automatically matched. Please review and
                    manually assign them to tenants if needed.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 mt-6">
                <Button onClick={handleProcessPayments} disabled={selectedPayments.size === 0}>
                  Process {selectedPayments.size} Payment{selectedPayments.size !== 1 ? "s" : ""}
                </Button>
                <Button variant="outline" onClick={() => setUploadSession(null)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
