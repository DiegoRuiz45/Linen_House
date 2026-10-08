import {
  Barcode,
  Boxes,
  Check,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  Layers3,
  PackageOpen,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Tag,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "./api";
import {
  confirmAction,
  showError,
  showSuccess,
  showWarning,
} from "./alerts";
import Modal from "./Modal";
import TablePagination from "./TablePagination";
import usePagination from "./usePagination";


const EMPTY_VARIANT = {
  size: "",
  color: "",
  sku: "",
  price: "",
  previous_price: "",
  stock: "0",
  minimum_stock: "0",
  active: true,
};


function money(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}


function numberOrNull(value) {
  return value === "" || value === null || value === undefined
    ? null
    : Number(value);
}


function imageUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${new URL(import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1").origin}${path}`;
}


function StatusPill({ active, children }) {
  return (
    <span className={`status ${active ? "status-active" : "status-cancelled"}`}>
      <span className="status-dot" />
      {children ?? (active ? "Activo" : "Inactivo")}
    </span>
  );
}


function FieldHint({ children }) {
  return <small className="field-hint">{children}</small>;
}


function BulkUploadModal({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    if (!file) return;
    setSaving(true);
    setError("");
    setResult(null);
    const payload = new FormData();
    payload.append("file", file);
    try {
      const importResult = await apiRequest("/admin/products/bulk-upload", {
        method: "POST",
        body: payload,
        alert: false,
      });
      setResult(importResult);
      await onImported(importResult);
      if (importResult.failed_products === 0) {
        await showSuccess(
          `${importResult.created_products} ${importResult.created_products === 1 ? "producto creado" : "productos creados"} correctamente.`,
        );
        onClose();
      } else if (importResult.created_products > 0) {
        await showWarning(
          `Se crearon ${importResult.created_products} productos y ${importResult.failed_products} requieren corrección. El detalle permanece abierto.`,
        );
      } else {
        await showError("Ningún producto pudo crearse. Revisa el detalle de cada registro.");
      }
    } catch (requestError) {
      setError(requestError.message);
      await showError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      description="Carga productos completos con variantes, precios por talla, inventario e imágenes públicas."
      eyebrow="Importación"
      onClose={onClose}
      size="medium"
      title="Carga masiva de productos"
    >
      <form className="stack-form" onSubmit={submit}>
        {error && <div className="notice error">{error}</div>}
        <a className="bulk-template-card" download href="/templates/plantilla-carga-masiva-productos.xlsx">
          <span><FileSpreadsheet size={23} /></span>
          <div><strong>Descargar plantilla de carga</strong><small>Incluye ejemplos, listas de validación e instrucciones.</small></div>
          <Download size={18} />
        </a>

        <label className="file-drop">
          <UploadCloud size={24} />
          <span><strong>{file?.name ?? "Seleccionar archivo"}</strong><small>Formato XLSX o CSV · máximo 5 MB.</small></span>
          <input
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            required
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        {result && (
          <section className="bulk-import-result">
            <div className="bulk-result-counts">
              <span><strong>{result.created_products}</strong> creados</span>
              <span className={result.failed_products ? "has-errors" : ""}><strong>{result.failed_products}</strong> con error</span>
              <span><strong>{result.skipped_rows}</strong> filas omitidas</span>
            </div>
            <div className="bulk-result-list">
              {result.results.map((item) => (
                <article className={item.created ? "created" : "failed"} key={item.product_key}>
                  <span>{item.created ? <Check size={15} /> : <X size={15} />}</span>
                  <div><strong>{item.name || item.product_key}</strong><small>{item.message}</small></div>
                </article>
              ))}
            </div>
          </section>
        )}

        <footer className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cerrar</button>
          <button className="primary-button with-icon" disabled={saving || !file} type="submit">
            <UploadCloud size={16} /> {saving ? "Procesando archivo…" : "Cargar productos"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}


function ProductCreateModal({ categories, onClose, onCreated }) {
  const [variants, setVariants] = useState([{ ...EMPTY_VARIANT }]);
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateVariant = (index, field, value) => {
    setVariants((current) => current.map((variant, variantIndex) => (
      variantIndex === index ? { ...variant, [field]: value } : variant
    )));
  };

  const submit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      const product = await apiRequest("/admin/products", {
        method: "POST",
        body: {
          category_id: Number(form.get("category_id")),
          name: form.get("name"),
          description: form.get("description") || null,
          base_price: Number(form.get("base_price")),
          previous_price: numberOrNull(form.get("previous_price")),
          active: form.get("active") === "on",
          featured: form.get("featured") === "on",
          variants: variants.map((variant) => ({
            size: variant.size,
            color: variant.color,
            sku: variant.sku,
            price: numberOrNull(variant.price),
            previous_price: numberOrNull(variant.previous_price),
            stock: Number(variant.stock || 0),
            minimum_stock: Number(variant.minimum_stock || 0),
            active: variant.active,
          })),
        },
      });

      let imageWarning = "";
      for (let index = 0; index < files.length; index += 1) {
        const imageForm = new FormData();
        imageForm.append("file", files[index]);
        imageForm.append("alt_text", form.get("name"));
        imageForm.append("is_primary", String(index === 0));
        try {
          await apiRequest(`/admin/products/${product.id}/images`, {
            method: "POST",
            body: imageForm,
          });
        } catch {
          imageWarning = "El producto se creó, pero una o más imágenes no pudieron subirse.";
          break;
        }
      }

      await onCreated(product.id, imageWarning);
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      description="Completa la información comercial, inventario inicial e imágenes sin salir del catálogo."
      eyebrow="Nuevo registro"
      onClose={onClose}
      size="large"
      title="Crear producto"
    >
      <form className="stack-form product-form" onSubmit={submit}>
        {error && <div className="notice error">{error}</div>}
        <section className="form-section">
          <div className="form-section-title"><span>01</span><div><h4>Información comercial</h4><p>Datos visibles en el catálogo.</p></div></div>
          <div className="form-grid">
            <label>Nombre del producto<input name="name" required minLength={2} maxLength={150} placeholder="Ej. Cubrelecho Magnolia" /></label>
            <label>Categoría<select name="category_id" required defaultValue=""><option value="" disabled>Selecciona una categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label>Precio actual<input name="base_price" required min="0" step="100" type="number" placeholder="249900" /></label>
            <label>Precio anterior<input name="previous_price" min="0" step="100" type="number" placeholder="Opcional" /><FieldHint>Se usa para mostrar el descuento.</FieldHint></label>
          </div>
          <label>Descripción<textarea name="description" maxLength={4000} rows={4} placeholder="Describe materiales, tacto, cuidados y beneficios…" /></label>
          <div className="toggle-row">
            <label className="switch-label"><input name="active" type="checkbox" defaultChecked /><span className="switch" /><span><strong>Producto activo</strong><small>Visible cuando tenga inventario.</small></span></label>
            <label className="switch-label"><input name="featured" type="checkbox" /><span className="switch" /><span><strong>Destacado</strong><small>Aparece en selecciones especiales.</small></span></label>
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-title"><span>02</span><div><h4>Variantes e inventario</h4><p>Cada talla y color debe tener un SKU único.</p></div><button className="secondary-button compact with-icon" type="button" onClick={() => setVariants((current) => [...current, { ...EMPTY_VARIANT }])}><Plus size={15} /> Agregar variante</button></div>
          <div className="variant-editor-list">
            {variants.map((variant, index) => (
              <article className="variant-editor" key={`variant-${index + 1}`}>
                <header><span>Variante {index + 1}</span>{variants.length > 1 && <button aria-label="Quitar variante" type="button" onClick={() => setVariants((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X size={15} /></button>}</header>
                <div className="form-grid three">
                  <label>Talla<input required value={variant.size} onChange={(event) => updateVariant(index, "size", event.target.value)} placeholder="Doble" /></label>
                  <label>Color<input required value={variant.color} onChange={(event) => updateVariant(index, "color", event.target.value)} placeholder="Blanco" /></label>
                  <label>SKU<input required minLength={2} value={variant.sku} onChange={(event) => updateVariant(index, "sku", event.target.value)} placeholder="LH-MAG-BLA-D" /></label>
                  <label>Precio de la talla<input min="0" step="100" type="number" value={variant.price} onChange={(event) => updateVariant(index, "price", event.target.value)} placeholder="Usa el precio base" /><FieldHint>Debe coincidir en todos los colores de esta talla.</FieldHint></label>
                  <label>Precio anterior de la talla<input min="0" step="100" type="number" value={variant.previous_price} onChange={(event) => updateVariant(index, "previous_price", event.target.value)} placeholder="Opcional" /></label>
                  <label>Stock inicial<input min="0" required type="number" value={variant.stock} onChange={(event) => updateVariant(index, "stock", event.target.value)} /></label>
                  <label>Stock mínimo<input min="0" required type="number" value={variant.minimum_stock} onChange={(event) => updateVariant(index, "minimum_stock", event.target.value)} /></label>
                  <label className="check-label"><input checked={variant.active} type="checkbox" onChange={(event) => updateVariant(index, "active", event.target.checked)} /> Variante activa</label>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-title"><span>03</span><div><h4>Galería</h4><p>La primera imagen será la portada del producto.</p></div></div>
          <label className="file-drop"><UploadCloud size={24} /><span><strong>Seleccionar imágenes</strong><small>JPG, PNG o WebP. Puedes elegir varias.</small></span><input multiple accept="image/jpeg,image/png,image/webp" type="file" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /></label>
          {files.length > 0 && <p className="file-selection"><Check size={15} /> {files.length} {files.length === 1 ? "imagen seleccionada" : "imágenes seleccionadas"}</p>}
        </section>

        <footer className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button with-icon" disabled={saving} type="submit"><PackageOpen size={16} /> {saving ? "Creando producto…" : "Crear producto"}</button></footer>
      </form>
    </Modal>
  );
}


function ProductEditModal({ categories, onClose, onSaved, product }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      await apiRequest(`/admin/products/${product.id}`, {
        method: "PUT",
        body: {
          category_id: Number(form.get("category_id")),
          name: form.get("name"),
          description: form.get("description") || null,
          base_price: Number(form.get("base_price")),
          previous_price: numberOrNull(form.get("previous_price")),
          active: form.get("active") === "on",
          featured: form.get("featured") === "on",
        },
      });
      await onSaved();
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal eyebrow="Catálogo" onClose={onClose} size="medium" title="Editar producto">
      <form className="stack-form" onSubmit={submit}>
        {error && <div className="notice error">{error}</div>}
        <div className="form-grid">
          <label>Nombre<input name="name" required defaultValue={product.name} /></label>
          <label>Categoría<select name="category_id" defaultValue={product.category_id}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label>Precio actual<input name="base_price" type="number" min="0" step="100" required defaultValue={product.base_price} /></label>
          <label>Precio anterior<input name="previous_price" type="number" min="0" step="100" defaultValue={product.previous_price ?? ""} /></label>
        </div>
        <label>Descripción<textarea name="description" rows={4} defaultValue={product.description ?? ""} /></label>
        <div className="toggle-row">
          <label className="switch-label"><input name="active" type="checkbox" defaultChecked={product.active} /><span className="switch" /><span><strong>Activo</strong><small>Disponible en el catálogo.</small></span></label>
          <label className="switch-label"><input name="featured" type="checkbox" defaultChecked={product.featured} /><span className="switch" /><span><strong>Destacado</strong><small>Prioridad comercial.</small></span></label>
        </div>
        <footer className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={saving} type="submit">{saving ? "Guardando…" : "Guardar cambios"}</button></footer>
      </form>
    </Modal>
  );
}


function VariantModal({ onClose, onDeleted, onSaved, product, variant = null }) {
  const editing = Boolean(variant);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      size: form.get("size"),
      color: form.get("color"),
      sku: form.get("sku"),
      price: numberOrNull(form.get("price")),
      previous_price: numberOrNull(form.get("previous_price")),
      minimum_stock: Number(form.get("minimum_stock") || 0),
      active: form.get("active") === "on",
    };
    if (!editing) body.stock = Number(form.get("stock") || 0);
    setSaving(true);
    setError("");
    try {
      await apiRequest(
        editing
          ? `/admin/products/${product.id}/variants/${variant.id}`
          : `/admin/products/${product.id}/variants`,
        { method: editing ? "PUT" : "POST", body },
      );
      await onSaved();
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!variant) return;
    const confirmed = await confirmAction({
      title: "¿Eliminar esta variante?",
      text: `${variant.size} · ${variant.color} (${variant.sku}) se eliminará de forma permanente. Si ya pertenece a un pedido, el sistema protegerá su historial y no permitirá borrarla.`,
      confirmText: "Sí, eliminar variante",
    });
    if (!confirmed) return;

    setDeleting(true);
    setError("");
    try {
      await apiRequest(`/admin/products/${product.id}/variants/${variant.id}`, {
        method: "DELETE",
        successMessage: "Variante eliminada correctamente.",
      });
      await onDeleted();
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal eyebrow={product.name} onClose={onClose} size="medium" title={editing ? "Editar variante" : "Nueva variante"}>
      <form className="stack-form" onSubmit={submit}>
        {error && <div className="notice error">{error}</div>}
        <div className="form-grid three">
          <label>Talla<input name="size" required defaultValue={variant?.size ?? ""} /></label>
          <label>Color<input name="color" required defaultValue={variant?.color ?? ""} /></label>
          <label>SKU<input name="sku" required minLength={2} defaultValue={variant?.sku ?? ""} /></label>
          <label>Precio de la talla<input name="price" type="number" min="0" step="100" defaultValue={variant?.price ?? ""} /><FieldHint>Al editarlo se aplica a todos los colores de esta talla.</FieldHint></label>
          <label>Precio anterior de la talla<input name="previous_price" type="number" min="0" step="100" defaultValue={variant?.previous_price ?? ""} /></label>
          {!editing && <label>Stock inicial<input name="stock" type="number" min="0" required defaultValue="0" /></label>}
          <label>Stock mínimo<input name="minimum_stock" type="number" min="0" required defaultValue={variant?.minimum_stock ?? 0} /></label>
        </div>
        {editing && <div className="info-strip"><Boxes size={17} /><span>El stock actual es <strong>{variant.stock}</strong>. Para modificarlo usa el módulo Inventario y conservarás la trazabilidad.</span></div>}
        <label className="switch-label"><input name="active" type="checkbox" defaultChecked={variant?.active ?? true} /><span className="switch" /><span><strong>Variante activa</strong><small>Disponible para compra.</small></span></label>
        <footer className="modal-actions">
          {editing && <button className="danger-button modal-danger-action" disabled={saving || deleting} type="button" onClick={remove}><Trash2 size={15} /> {deleting ? "Eliminando…" : "Eliminar variante"}</button>}
          <button className="secondary-button" disabled={deleting} type="button" onClick={onClose}>Cancelar</button>
          <button className="primary-button" disabled={saving || deleting} type="submit">{saving ? "Guardando…" : editing ? "Guardar variante" : "Crear variante"}</button>
        </footer>
      </form>
    </Modal>
  );
}


function ImageUploadModal({ onClose, onSaved, product }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const files = Array.from(form.getAll("files")).filter((file) => file.size > 0);
    setSaving(true);
    setError("");
    try {
      for (let index = 0; index < files.length; index += 1) {
        const payload = new FormData();
        payload.append("file", files[index]);
        payload.append("alt_text", form.get("alt_text") || product.name);
        payload.append("is_primary", String(form.get("is_primary") === "on" && index === 0));
        await apiRequest(`/admin/products/${product.id}/images`, { method: "POST", body: payload });
      }
      await onSaved();
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal eyebrow={product.name} onClose={onClose} size="medium" title="Agregar imágenes">
      <form className="stack-form" onSubmit={submit}>
        {error && <div className="notice error">{error}</div>}
        <label className="file-drop"><UploadCloud size={24} /><span><strong>Seleccionar archivos</strong><small>Las imágenes se optimizan y almacenan en WebP.</small></span><input name="files" multiple required accept="image/jpeg,image/png,image/webp" type="file" /></label>
        <label>Texto alternativo<input name="alt_text" maxLength={255} placeholder={product.name} /><FieldHint>Describe la imagen para accesibilidad y SEO.</FieldHint></label>
        <label className="switch-label"><input name="is_primary" type="checkbox" /><span className="switch" /><span><strong>Usar como portada</strong><small>La primera imagen reemplazará la portada actual.</small></span></label>
        <footer className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button with-icon" disabled={saving} type="submit"><UploadCloud size={16} /> {saving ? "Subiendo…" : "Subir imágenes"}</button></footer>
      </form>
    </Modal>
  );
}


function ImageEditModal({ image, onClose, onSaved, product }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      await apiRequest(`/admin/products/${product.id}/images/${image.id}`, {
        method: "PATCH",
        body: {
          alt_text: form.get("alt_text") || null,
          position: Number(form.get("position") || 0),
          is_primary: form.get("is_primary") === "on",
        },
      });
      await onSaved();
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal eyebrow={product.name} onClose={onClose} size="small" title="Editar imagen">
      <form className="stack-form" onSubmit={submit}>
        {error && <div className="notice error">{error}</div>}
        <img className="modal-image-preview" src={imageUrl(image.image_url)} alt={image.alt_text ?? product.name} />
        <label>Texto alternativo<input name="alt_text" maxLength={255} defaultValue={image.alt_text ?? ""} /></label>
        <label>Posición<input name="position" type="number" min="0" defaultValue={image.position} /></label>
        <label className="switch-label"><input name="is_primary" type="checkbox" defaultChecked={image.is_primary} /><span className="switch" /><span><strong>Imagen principal</strong><small>Se mostrará como portada.</small></span></label>
        <footer className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={saving} type="submit">{saving ? "Guardando…" : "Guardar imagen"}</button></footer>
      </form>
    </Modal>
  );
}


export default function ProductsWorkspace() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productData, categoryData] = await Promise.all([
        apiRequest("/admin/products"),
        apiRequest("/admin/categories"),
      ]);
      setProducts(productData);
      setCategories(categoryData);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Sincroniza el catálogo remoto al montar la vista.
    // oxlint-disable-next-line react/set-state-in-effect
    loadData();
  }, [loadData]);

  const loadDetail = useCallback(async (productId) => {
    setDetailLoading(true);
    setError("");
    try {
      setSelected(await apiRequest(`/admin/products/${productId}`));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const refreshSelected = async () => {
    await loadData();
    if (selected?.id) await loadDetail(selected.id);
  };

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch = !query || [product.name, product.slug, product.category_name]
        .some((value) => value?.toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all"
        || (statusFilter === "active" && product.active)
        || (statusFilter === "inactive" && !product.active)
        || (statusFilter === "featured" && product.featured);
      return matchesSearch && matchesStatus;
    });
  }, [products, search, statusFilter]);

  const pagination = usePagination(filteredProducts);

  const statistics = useMemo(() => ({
    active: products.filter((product) => product.active).length,
    featured: products.filter((product) => product.featured).length,
    stock: products.reduce((total, product) => total + Number(product.stock_total ?? 0), 0),
  }), [products]);

  const productCreated = async (productId, warning) => {
    await loadData();
    await loadDetail(productId);
    setSuccess(warning || "Producto creado con sus variantes e imágenes.");
    if (warning) setError(warning);
  };

  const productSaved = async () => {
    await refreshSelected();
    setSuccess("Producto actualizado correctamente.");
  };

  const bulkImported = async (result) => {
    await loadData();
    if (result.created_products > 0) {
      setSuccess(
        `${result.created_products} ${result.created_products === 1 ? "producto importado" : "productos importados"}.`,
      );
    }
  };

  const variantSaved = async () => {
    await refreshSelected();
    setSuccess(modal?.variant ? "Variante actualizada." : "Variante creada con su movimiento inicial.");
  };

  const variantDeleted = async () => {
    await refreshSelected();
    setSuccess("Variante eliminada correctamente.");
  };

  const imageSaved = async () => {
    await refreshSelected();
    setSuccess("Galería actualizada correctamente.");
  };

  const deleteImage = async (image) => {
    const confirmed = await confirmAction({
      title: "¿Eliminar esta imagen?",
      text: "La imagen se eliminará de forma permanente de la galería del producto.",
      confirmText: "Sí, eliminar imagen",
    });
    if (!confirmed) return;
    setError("");
    try {
      await apiRequest(`/admin/products/${selected.id}/images/${image.id}`, {
        method: "DELETE",
        successMessage: "Imagen eliminada correctamente.",
      });
      await refreshSelected();
      setSuccess("Imagen eliminada.");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="products-page">
      <header className="section-title product-title">
        <div>
          <p className="eyebrow">Catálogo central</p>
          <h2>Productos</h2>
          <p>Gestiona información comercial, variantes, inventario e imágenes desde un solo lugar.</p>
        </div>
        <div className="title-actions">
          <button className="icon-button" title="Actualizar" type="button" onClick={loadData}><RefreshCw size={17} /></button>
          <button className="secondary-button with-icon" type="button" onClick={() => setModal({ type: "bulk-upload" })}><FileSpreadsheet size={17} /> Carga masiva</button>
          <button className="primary-button with-icon" type="button" onClick={() => setModal({ type: "create" })}><Plus size={17} /> Nuevo producto</button>
        </div>
      </header>

      {(error || success) && <div className={`notice ${error ? "error" : "success"}`}>{error || success}</div>}

      <section className="catalog-overview">
        <article><span className="overview-icon tone-clay"><PackageOpen size={19} /></span><div><small>Total productos</small><strong>{products.length}</strong></div></article>
        <article><span className="overview-icon tone-green"><Check size={19} /></span><div><small>Activos</small><strong>{statistics.active}</strong></div></article>
        <article><span className="overview-icon tone-gold"><Sparkles size={19} /></span><div><small>Destacados</small><strong>{statistics.featured}</strong></div></article>
        <article><span className="overview-icon tone-blue"><Boxes size={19} /></span><div><small>Unidades en stock</small><strong>{statistics.stock}</strong></div></article>
      </section>

      <section className="panel catalog-panel">
        <div className="catalog-toolbar">
          <label className="search-box"><Search size={17} /><input aria-label="Buscar productos" value={search} onChange={(event) => { setSearch(event.target.value); pagination.goToPage(1); }} placeholder="Buscar por nombre, categoría o slug…" /></label>
          <div className="filter-tabs" role="group" aria-label="Filtrar productos">
            {[['all', 'Todos'], ['active', 'Activos'], ['featured', 'Destacados'], ['inactive', 'Inactivos']].map(([value, label]) => <button className={statusFilter === value ? "active" : ""} type="button" key={value} onClick={() => { setStatusFilter(value); pagination.goToPage(1); }}>{label}</button>)}
          </div>
          <span className="result-count">{filteredProducts.length} resultados</span>
        </div>

        <div className="product-master-detail">
          <div className="product-table-wrap">
            {loading ? <div className="center-screen compact-loader"><div className="spinner" /><p>Cargando catálogo…</p></div> : filteredProducts.length === 0 ? <div className="empty-state"><PackageOpen size={30} /><strong>No encontramos productos</strong><span>Ajusta los filtros o crea un nuevo registro.</span></div> : (
              <><div className="table-scroll">
                <table className="professional-table product-table">
                  <thead><tr><th>Producto</th><th>Precio</th><th>Inventario</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead>
                  <tbody>{pagination.items.map((product) => (
                    <tr className={selected?.id === product.id ? "selected-row" : ""} key={product.id}>
                      <td><div className="entity-cell">{product.primary_image_url ? <img src={imageUrl(product.primary_image_url)} alt="" /> : <span className="table-icon tone-clay"><PackageOpen size={18} /></span>}<span><strong>{product.name}</strong><small><Tag size={11} /> {product.category_name}</small></span></div></td>
                      <td><strong>{money(product.base_price)}</strong>{product.previous_price && <small className="struck-price">{money(product.previous_price)}</small>}</td>
                      <td><strong>{product.stock_total} uds.</strong><small>{product.variants_count} {product.variants_count === 1 ? "variante" : "variantes"}</small></td>
                      <td><div className="status-stack"><StatusPill active={product.active} />{product.featured && <span className="featured-label"><Star size={11} fill="currentColor" /> Destacado</span>}</div></td>
                      <td><button aria-label={`Administrar ${product.name}`} className="row-button" type="button" onClick={() => loadDetail(product.id)}><ChevronRight size={17} /></button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div><TablePagination pagination={pagination} /></>
            )}
          </div>

          <aside className="product-inspector">
            {detailLoading ? <div className="center-screen compact-loader"><div className="spinner" /><p>Cargando producto…</p></div> : !selected ? (
              <div className="inspector-empty"><span><PackageOpen size={30} /></span><h3>Selecciona un producto</h3><p>Aquí verás su información, variantes y galería.</p></div>
            ) : (
              <div className="inspector-content">
                <div className="product-hero">
                  {selected.images.find((image) => image.is_primary) || selected.images[0] ? <img src={imageUrl((selected.images.find((image) => image.is_primary) || selected.images[0]).image_url)} alt={selected.name} /> : <div className="product-placeholder"><ImageIcon size={34} /><span>Sin imagen</span></div>}
                  <div className="hero-overlay"><StatusPill active={selected.active} />{selected.featured && <span className="featured-label light"><Star size={11} fill="currentColor" /> Destacado</span>}</div>
                </div>
                <div className="inspector-header">
                  <div><p className="eyebrow">{selected.category_name}</p><h3>{selected.name}</h3><span className="product-slug">/{selected.slug}</span></div>
                  <button className="icon-button" title="Editar producto" type="button" onClick={() => setModal({ type: "edit-product" })}><Pencil size={16} /></button>
                </div>
                <div className="price-block"><div><small>Precio actual</small><strong>{money(selected.base_price)}</strong></div>{selected.previous_price && <div><small>Precio anterior</small><span>{money(selected.previous_price)}</span></div>}</div>
                {selected.description && <p className="product-description">{selected.description}</p>}

                <section className="inspector-section">
                  <header><div><span className="section-icon tone-blue"><Layers3 size={16} /></span><div><h4>Variantes</h4><p>{selected.variants.length} configuradas</p></div></div><button className="secondary-button compact with-icon" type="button" onClick={() => setModal({ type: "variant" })}><Plus size={14} /> Agregar</button></header>
                  {selected.variants.length === 0 ? <div className="mini-empty">Este producto aún no tiene variantes.</div> : <div className="variant-table">{selected.variants.map((variant) => <button type="button" key={variant.id} onClick={() => setModal({ type: "variant", variant })}><span className="variant-icon"><Barcode size={17} /></span><span><strong>{variant.size} · {variant.color}</strong><small>{variant.sku}</small></span><span><strong>{money(variant.price ?? selected.base_price)}</strong><small>Stock {variant.stock} · Mín. {variant.minimum_stock}</small></span><StatusPill active={variant.active}>{variant.active ? "Activa" : "Inactiva"}</StatusPill><Pencil size={14} /></button>)}</div>}
                </section>

                <section className="inspector-section">
                  <header><div><span className="section-icon tone-clay"><ImageIcon size={16} /></span><div><h4>Galería</h4><p>{selected.images.length} imágenes</p></div></div><button className="secondary-button compact with-icon" type="button" onClick={() => setModal({ type: "upload-image" })}><UploadCloud size={14} /> Subir</button></header>
                  {selected.images.length === 0 ? <div className="mini-empty">Agrega imágenes para presentar mejor el producto.</div> : <div className="professional-image-grid">{selected.images.map((image) => <figure key={image.id}><img src={imageUrl(image.image_url)} alt={image.alt_text ?? selected.name} />{image.is_primary && <span className="primary-image-label"><Star size={11} fill="currentColor" /> Portada</span>}<div className="image-actions"><button aria-label="Editar imagen" type="button" onClick={() => setModal({ type: "edit-image", image })}><Pencil size={14} /></button><button aria-label="Eliminar imagen" className="danger" type="button" onClick={() => deleteImage(image)}><Trash2 size={14} /></button></div></figure>)}</div>}
                </section>
              </div>
            )}
          </aside>
        </div>
      </section>

      {modal?.type === "create" && <ProductCreateModal categories={categories.filter((category) => category.active)} onClose={() => setModal(null)} onCreated={productCreated} />}
      {modal?.type === "bulk-upload" && <BulkUploadModal onClose={() => setModal(null)} onImported={bulkImported} />}
      {modal?.type === "edit-product" && selected && <ProductEditModal categories={categories} product={selected} onClose={() => setModal(null)} onSaved={productSaved} />}
      {modal?.type === "variant" && selected && <VariantModal product={selected} variant={modal.variant} onClose={() => setModal(null)} onDeleted={variantDeleted} onSaved={variantSaved} />}
      {modal?.type === "upload-image" && selected && <ImageUploadModal product={selected} onClose={() => setModal(null)} onSaved={imageSaved} />}
      {modal?.type === "edit-image" && selected && <ImageEditModal image={modal.image} product={selected} onClose={() => setModal(null)} onSaved={imageSaved} />}
    </div>
  );
}
