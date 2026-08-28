'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useDataScope } from '@/hooks/use-data-scope';
import { usePermissions } from '@/hooks/use-permissions';
import {
  useHubs,
  useInventory,
  useInventoryRequests,
  useCreateInventoryRequest,
  useApproveInventoryRequest,
  useRejectInventoryRequest,
  useFulfillInventoryRequest,
  useCancelInventoryRequest,
} from '@/hooks/use-queries';
import type { ApiInventoryRequest, InventoryRequestStatus } from '@/types/api';
import { Hub } from '@/types';
import { hubOptionLabel } from '@/lib/api-mappers';
import { SubmitButton } from '@/components/submit-button';
import { TableSkeleton } from '@/components/ui/loading-skeletons';
import { toast } from 'sonner';
import { Plus, Package, Check, X, Truck, Ban } from 'lucide-react';

function hubName(ref: ApiInventoryRequest['requesting_location']) {
  return typeof ref === 'object' && ref ? ref.hub_name ?? '—' : '—';
}

function hubId(ref: ApiInventoryRequest['requesting_location']) {
  return typeof ref === 'object' && ref ? ref._id : String(ref);
}

function isCartonsUom(uom?: string) {
  return (uom ?? '').trim().toLowerCase() === 'cartons';
}

function formatLineDisplay(line: {
  product_name: string;
  quantity: number;
  uom: string;
  sku?: string;
  carton_weight_kg?: number;
  stock_quantity?: number;
}) {
  const sku = line.sku ? ` (${line.sku})` : '';
  const weight = line.carton_weight_kg;
  if (weight && weight > 0 && line.uom === 'Carton') {
    return `${line.product_name} — ${line.quantity} Carton (= ${(line.quantity * weight).toFixed(2)} Kg)${sku}`;
  }
  if (weight && weight > 0 && line.uom === 'Kg') {
    return `${line.product_name} — ${line.quantity} Kg (= ${(line.quantity / weight).toFixed(4)} Carton)${sku}`;
  }
  return `${line.product_name} — ${line.quantity} ${line.uom}${sku}`;
}

const STATUS_STYLES: Record<InventoryRequestStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-amber-100 text-amber-800',
  fulfilled: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-muted text-muted-foreground',
};

export function InventoryRequestsPanel() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { hubId: scopeHubId } = useDataScope();
  const { data: hubs = [] } = useHubs();
  const { data: requests = [], isLoading } = useInventoryRequests();
  const createRequest = useCreateInventoryRequest();
  const approveRequest = useApproveInventoryRequest();
  const rejectRequest = useRejectInventoryRequest();
  const fulfillRequest = useFulfillInventoryRequest();
  const cancelRequest = useCancelInventoryRequest();

  const activeHubs = hubs.filter((h) => h.isActive);
  const rspLocations = activeHubs;

  const defaultRequestingLocation =
    scopeHubId ?? rspLocations[0]?.id ?? '';

  const [showForm, setShowForm] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(defaultRequestingLocation);
  const [fulfillingHub, setFulfillingHub] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [requestUom, setRequestUom] = useState('');
  const [notes, setNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<InventoryRequestStatus | 'all'>('all');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fulfillingLocations = useMemo(
    () => activeHubs.filter((h) => h.id !== requestingLocation),
    [activeHubs, requestingLocation],
  );

  const { data: fulfillingInventory = [] } = useInventory({
    hub_id: fulfillingHub || undefined,
  });

  const selectedProduct = useMemo(
    () => fulfillingInventory.find((p) => p.id === productId),
    [fulfillingInventory, productId],
  );

  const isCartonProduct = isCartonsUom(selectedProduct?.unitOfMeasure);
  const cartonWeight = selectedProduct?.cartonWeight;

  const unitOptions = useMemo(() => {
    if (!selectedProduct) return [];
    if (isCartonProduct) return ['Carton', 'Kg'];
    return [selectedProduct.unitOfMeasure || 'Units'];
  }, [selectedProduct, isCartonProduct]);

  const conversionPreview = useMemo(() => {
    if (!selectedProduct || !(quantity > 0)) return null;
    if (!isCartonProduct || !(cartonWeight && cartonWeight > 0)) return null;
    if (requestUom === 'Carton') {
      return `${quantity} Carton = ${(quantity * cartonWeight).toFixed(2)} Kg`;
    }
    if (requestUom === 'Kg') {
      return `${quantity} Kg = ${(quantity / cartonWeight).toFixed(4)} Carton`;
    }
    return null;
  }, [selectedProduct, quantity, isCartonProduct, cartonWeight, requestUom]);

  const suggestedHub = useMemo(() => {
    const loc = hubs.find((h) => h.id === requestingLocation);
    if (loc?.parentHubId) return loc.parentHubId;
    return activeHubs.find((h) => h.locationType === 'hub')?.id ?? activeHubs[0]?.id ?? '';
  }, [hubs, requestingLocation, activeHubs]);

  const filteredRequests = useMemo(() => {
    if (statusFilter === 'all') return requests;
    return requests.filter((r) => r.status === statusFilter);
  }, [requests, statusFilter]);

  const canRequest = can('inventory.request');
  const canFulfill = can('inventory.fulfill_requests');

  const selectProduct = (id: string) => {
    setProductId(id);
    const product = fulfillingInventory.find((p) => p.id === id);
    if (!product) {
      setRequestUom('');
      return;
    }
    setRequestUom(isCartonsUom(product.unitOfMeasure) ? 'Carton' : product.unitOfMeasure);
  };

  const handleCreate = async () => {
    if (!requestingLocation || !fulfillingHub || !productId || quantity <= 0 || !requestUom) {
      toast.error('Select requesting location, fulfilling location, product, quantity, and unit.');
      return;
    }
    const product = fulfillingInventory.find((p) => p.id === productId);
    if (!product) {
      toast.error('Product not found.');
      return;
    }
    if (isCartonsUom(product.unitOfMeasure) && !(product.cartonWeight && product.cartonWeight > 0)) {
      toast.error('This carton product has no catalog carton weight; cannot request.');
      return;
    }
    try {
      await createRequest.mutateAsync({
        requesting_location: requestingLocation,
        fulfilling_hub: fulfillingHub,
        lines: [
          {
            product_id: product.id,
            product_name: product.name,
            sku: product.sku,
            quantity,
            uom: requestUom,
          },
        ],
        notes: notes.trim() || undefined,
      });
      toast.success('Inventory request submitted.');
      setShowForm(false);
      setProductId('');
      setQuantity(1);
      setRequestUom('');
      setNotes('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit request.');
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      toast.error('Rejection reason is required.');
      return;
    }
    try {
      await rejectRequest.mutateAsync({ id, rejection_reason: rejectReason.trim() });
      toast.success('Request rejected.');
      setRejectingId(null);
      setRejectReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject request.');
    }
  };

  const inputCls = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
  const labelCls = 'text-sm font-medium';
  const btnPrimary = 'inline-flex items-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2';
  const btnSecondary = 'inline-flex items-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-4 py-2';

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package size={18} /> Inventory Requests
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Request stock from another hub or RSP. Parent hub is suggested but not required.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InventoryRequestStatus | 'all')}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {canRequest && (
            <button
              type="button"
              onClick={() => {
                setRequestingLocation(defaultRequestingLocation);
                setFulfillingHub(suggestedHub);
                setShowForm(true);
              }}
              className={btnPrimary}
            >
              <Plus size={14} className="mr-2" /> New Request
            </button>
          )}
        </div>
      </div>

      {showForm && canRequest && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h3 className="font-semibold text-sm">Submit stock request</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className={labelCls}>Requesting location</label>
              <select
                value={requestingLocation}
                onChange={(e) => {
                  setRequestingLocation(e.target.value);
                  const loc = hubs.find((h) => h.id === e.target.value);
                  if (loc?.parentHubId) setFulfillingHub(loc.parentHubId);
                }}
                className={inputCls}
              >
                {rspLocations.map((h: Hub) => (
                  <option key={h.id} value={h.id}>
                    {hubOptionLabel(h)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className={labelCls}>Fulfilling location</label>
              <select
                value={fulfillingHub}
                onChange={(e) => {
                  setFulfillingHub(e.target.value);
                  setProductId('');
                  setRequestUom('');
                }}
                className={inputCls}
              >
                <option value="">Select location</option>
                {fulfillingLocations.map((h) => (
                  <option key={h.id} value={h.id}>
                    {hubOptionLabel(h, h.id === suggestedHub ? '(Suggested)' : undefined)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className={labelCls}>Product (from fulfilling location)</label>
              <select
                value={productId}
                onChange={(e) => selectProduct(e.target.value)}
                className={inputCls}
                disabled={!fulfillingHub}
              >
                <option value="">Select product</option>
                {fulfillingInventory.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.currentStock} {p.unitOfMeasure}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className={labelCls}>Quantity</label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
            <div className="space-y-2">
              <label className={labelCls}>Unit</label>
              <select
                value={requestUom}
                onChange={(e) => setRequestUom(e.target.value)}
                className={inputCls}
                disabled={!selectedProduct}
              >
                {!selectedProduct && <option value="">Select product first</option>}
                {unitOptions.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            {isCartonProduct && (
              <div className="space-y-1 md:col-span-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {cartonWeight && cartonWeight > 0 ? (
                  <>
                    <p>1 carton = {cartonWeight} Kg (from product catalog)</p>
                    {conversionPreview && (
                      <p className="font-medium text-foreground">{conversionPreview}</p>
                    )}
                  </>
                ) : (
                  <p className="text-destructive">
                    This product has no valid carton weight in the catalog.
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2 md:col-span-2">
              <label className={labelCls}>Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={inputCls}
                placeholder="Urgency, delivery window, etc."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className={btnSecondary}>
              Cancel
            </button>
            <SubmitButton onClick={handleCreate} loading={createRequest.isPending}>
              Submit request
            </SubmitButton>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={5} cols={4} className="p-4" />
        ) : filteredRequests.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No inventory requests yet.</p>
        ) : (
          <div className="divide-y">
            {filteredRequests.map((req) => {
              const fulfillingId =
                typeof req.fulfilling_hub === 'object'
                  ? req.fulfilling_hub._id
                  : String(req.fulfilling_hub);
              const isFulfillingHub =
                canFulfill &&
                (user?.roleName === 'company_admin' || scopeHubId === fulfillingId);

              return (
                <div key={req._id} className="p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">
                        {hubName(req.requesting_location)} → {hubName(req.fulfilling_hub)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Requested by {req.requested_by_name ?? '—'}
                        {req.createdAt ? ` · ${new Date(req.createdAt).toLocaleString()}` : ''}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[req.status]}`}>
                      {req.status}
                    </span>
                  </div>
                  <ul className="text-xs space-y-1">
                    {req.lines.map((line, idx) => (
                      <li key={idx}>{formatLineDisplay(line)}</li>
                    ))}
                  </ul>
                  {req.notes && (
                    <p className="text-xs text-muted-foreground italic">{req.notes}</p>
                  )}
                  {req.rejection_reason && (
                    <p className="text-xs text-red-600">Rejected: {req.rejection_reason}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {req.status === 'submitted' && isFulfillingHub && (
                      <button
                        type="button"
                        onClick={() => approveRequest.mutateAsync(req._id).then(() => toast.success('Approved.')).catch((e) => toast.error(e.message))}
                        className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        <Check size={12} /> Approve
                      </button>
                    )}
                    {req.status === 'approved' && isFulfillingHub && (
                      <button
                        type="button"
                        onClick={() => fulfillRequest.mutateAsync(req._id).then(() => toast.success('Fulfilled — stock transferred.')).catch((e) => toast.error(e.message))}
                        className="text-xs font-medium text-green-700 hover:underline flex items-center gap-1"
                      >
                        <Truck size={12} /> Fulfill
                      </button>
                    )}
                    {(req.status === 'submitted' || req.status === 'approved') && isFulfillingHub && (
                      <button
                        type="button"
                        onClick={() => setRejectingId(req._id)}
                        className="text-xs font-medium text-destructive hover:underline flex items-center gap-1"
                      >
                        <X size={12} /> Reject
                      </button>
                    )}
                    {(req.status === 'submitted' || req.status === 'approved') &&
                      hubId(req.requesting_location) === scopeHubId && (
                        <button
                          type="button"
                          onClick={() => cancelRequest.mutateAsync(req._id).then(() => toast.success('Cancelled.')).catch((e) => toast.error(e.message))}
                          className="text-xs font-medium text-muted-foreground hover:underline flex items-center gap-1"
                        >
                          <Ban size={12} /> Cancel
                        </button>
                      )}
                  </div>
                  {rejectingId === req._id && (
                    <div className="flex gap-2 items-end pt-2">
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Rejection reason"
                        className={inputCls}
                      />
                      <SubmitButton onClick={() => handleReject(req._id)} loading={rejectRequest.isPending}>
                        Confirm
                      </SubmitButton>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
