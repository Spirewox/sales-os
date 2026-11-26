'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useDataScope } from '@/hooks/use-data-scope';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import { useCreateInventoryRequest, useHubs, useInventory } from '@/hooks/use-queries';
import { hubOptionLabel } from '@/lib/api-mappers';
import { isVolumeUom, volumeConversionPreview, volumeUnitOptions } from '@/lib/volume-units';
import { FilterSelect } from '@/components/filter-select';
import { FormField, FormSection, FormSheet, fieldClass } from '@/components/app';
import { isCartonsUom } from '../inventory-utils';
import { selectClass } from './form-bits';

/** Request stock from another hub or RSP. The parent hub is suggested but not required. */
export function RequestForm({ onClose }: Readonly<{ onClose: () => void }>) {
  const { hubId: scopeHubId } = useDataScope();
  const { data: hubs = [] } = useHubs();
  const createRequest = useCreateInventoryRequest();
  const activeHubs = useMemo(() => hubs.filter((h) => h.isActive), [hubs]);
  // Request for one of your own locations, starting at the one you are looking at.
  const hubScope = useHubScopeFilter();
  const ownLocations = hubScope.activeHubs.length ? hubScope.activeHubs : activeHubs;
  const viewingId = hubScope.filterHub !== 'All' ? ownLocations.find((h) => h.name === hubScope.filterHub)?.id : undefined;

  const [requestingLocation, setRequestingLocation] = useState(() => viewingId ?? scopeHubId ?? ownLocations[0]?.id ?? '');
  const effectiveRequesting = requestingLocation || scopeHubId || activeHubs[0]?.id || '';
  const suggestedHub = useMemo(() => {
    const loc = hubs.find((h) => h.id === effectiveRequesting);
    if (loc?.parentHubId) return loc.parentHubId;
    return activeHubs.find((h) => h.locationType === 'hub')?.id ?? activeHubs[0]?.id ?? '';
  }, [hubs, effectiveRequesting, activeHubs]);
  const [pickedFulfilling, setPickedFulfilling] = useState<string | null>(null);
  const fulfillingHub = pickedFulfilling ?? (suggestedHub !== effectiveRequesting ? suggestedHub : '');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [requestUom, setRequestUom] = useState('');
  const [notes, setNotes] = useState('');

  const fulfillingLocations = useMemo(() => activeHubs.filter((h) => h.id !== effectiveRequesting), [activeHubs, effectiveRequesting]);
  const { data: fulfillingInventory = [] } = useInventory({ hub_id: fulfillingHub || undefined });
  const selectedProduct = useMemo(() => fulfillingInventory.find((p) => p.id === productId), [fulfillingInventory, productId]);
  const isCartonProduct = isCartonsUom(selectedProduct?.unitOfMeasure);
  const cartonWeight = selectedProduct?.cartonWeight;

  const unitOptions = useMemo(() => {
    if (!selectedProduct) return [];
    if (isCartonProduct) return ['Carton', 'Kg'];
    if (isVolumeUom(selectedProduct.unitOfMeasure)) return volumeUnitOptions(selectedProduct.unitOfMeasure);
    return [selectedProduct.unitOfMeasure || 'Units'];
  }, [selectedProduct, isCartonProduct]);

  const conversionPreview = useMemo(() => {
    if (!selectedProduct || !(quantity > 0)) return null;
    if (isVolumeUom(selectedProduct.unitOfMeasure)) return volumeConversionPreview(selectedProduct.unitOfMeasure, quantity, requestUom);
    if (!isCartonProduct || !(cartonWeight && cartonWeight > 0)) return null;
    if (requestUom === 'Carton') return `${quantity} Carton = ${(quantity * cartonWeight).toFixed(2)} Kg`;
    if (requestUom === 'Kg') return `${quantity} Kg = ${(quantity / cartonWeight).toFixed(4)} Carton`;
    return null;
  }, [selectedProduct, quantity, isCartonProduct, cartonWeight, requestUom]);

  const selectProduct = (id: string) => {
    setProductId(id);
    const product = fulfillingInventory.find((p) => p.id === id);
    setRequestUom(product ? (isCartonsUom(product.unitOfMeasure) ? 'Carton' : product.unitOfMeasure) : '');
  };

  const handleCreate = async () => {
    if (!effectiveRequesting || !fulfillingHub || !productId || quantity <= 0 || !requestUom) {
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
        requesting_location: effectiveRequesting,
        fulfilling_hub: fulfillingHub,
        lines: [{ product_id: product.id, product_name: product.name, sku: product.sku, quantity, uom: requestUom }],
        notes: notes.trim() || undefined,
      });
      toast.success('Inventory request submitted.');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit request.');
    }
  };

  const disabledReason = !fulfillingHub
    ? 'Choose a fulfilling location'
    : !productId
      ? 'Choose a product'
      : !(quantity > 0)
        ? 'Enter a quantity'
        : null;

  return (
    <FormSheet
      title="New stock request"
      description="Request stock from another hub or RSP. The parent hub is suggested but not required."
      onClose={onClose}
      onSubmit={() => void handleCreate()}
      submitLabel="Submit request"
      submitting={createRequest.isPending}
      disabledReason={disabledReason}
      preview={conversionPreview}
    >
      <FormSection title="Product">
        <FormField label="Fulfilling location" htmlFor="req-fulfilling" required>
          <FilterSelect
            id="req-fulfilling"
            value={fulfillingHub || 'none'}
            className={selectClass}
            onChange={(v) => { setPickedFulfilling(v === 'none' ? '' : v); setProductId(''); setRequestUom(''); }}
            options={[
              { value: 'none', label: 'Choose location' },
              ...fulfillingLocations.map((h) => ({ value: h.id, label: hubOptionLabel(h, h.id === suggestedHub ? '(Suggested)' : undefined) })),
            ]}
          />
        </FormField>
        <FormField label="Product (from fulfilling location)" htmlFor="req-product" required>
          <FilterSelect
            id="req-product"
            value={productId || 'none'}
            className={selectClass}
            onChange={(v) => selectProduct(v === 'none' ? '' : v)}
            options={[
              { value: 'none', label: fulfillingHub ? 'Choose product' : 'Choose a location first' },
              ...fulfillingInventory.map((p) => ({ value: p.id, label: `${p.name}, ${p.currentStock} ${p.unitOfMeasure}` })),
            ]}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Quantity" htmlFor="req-qty" required>
            <input id="req-qty" type="number" min={0.01} step="0.01" value={quantity} onChange={(e) => setQuantity(Number(e.target.value) || 0)} className={fieldClass} />
          </FormField>
          <FormField label="Unit" htmlFor="req-unit" required>
            <FilterSelect
              id="req-unit"
              value={requestUom || 'none'}
              className={selectClass}
              onChange={(v) => setRequestUom(v === 'none' ? '' : v)}
              options={selectedProduct ? unitOptions.map((u) => ({ value: u, label: u })) : [{ value: 'none', label: 'Choose product first' }]}
            />
          </FormField>
        </div>
        {isCartonProduct && (
          <p className={cartonWeight && cartonWeight > 0 ? 'text-xs text-muted-foreground' : 'text-xs text-destructive'}>
            {cartonWeight && cartonWeight > 0 ? `1 carton = ${cartonWeight} Kg (from product catalog)` : 'This product has no valid carton weight in the catalog.'}
          </p>
        )}
        {isVolumeUom(selectedProduct?.unitOfMeasure) && conversionPreview && <p className="text-xs text-muted-foreground">1000 ml = 1 Liter</p>}
      </FormSection>
      <FormSection title="Request details">
        <FormField label="Requesting location" htmlFor="req-requesting">
          <FilterSelect
            id="req-requesting"
            value={effectiveRequesting}
            className={selectClass}
            onChange={(v) => {
              setRequestingLocation(v);
              const loc = hubs.find((h) => h.id === v);
              if (loc?.parentHubId) setPickedFulfilling(loc.parentHubId);
            }}
            options={ownLocations.map((h) => ({ value: h.id, label: hubOptionLabel(h) }))}
          />
        </FormField>
        <FormField label="Notes (optional)" htmlFor="req-notes">
          <input id="req-notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className={fieldClass} placeholder="Urgency, delivery window, etc." />
        </FormField>
      </FormSection>
    </FormSheet>
  );
}
