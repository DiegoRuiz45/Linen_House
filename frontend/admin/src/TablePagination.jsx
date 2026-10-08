import { PAGE_SIZE_OPTIONS } from "./usePagination";


export default function TablePagination({ pagination }) {
  const {
    currentPage,
    firstItem,
    goToPage,
    lastItem,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
  } = pagination;

  return (
    <footer className="table-pagination">
      <label className="pagination-size">
        <span>Registros por página</span>
        <select
          aria-label="Registros por página"
          value={pageSize}
          onChange={(event) => setPageSize(event.target.value)}
        >
          {PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>

      <span className="pagination-summary" aria-live="polite">
        {firstItem}–{lastItem} de {totalItems}
      </span>

      <div className="pagination-controls" aria-label="Navegación de páginas">
        <button
          aria-label="Primera página"
          disabled={currentPage === 1}
          type="button"
          onClick={() => goToPage(1)}
        >«</button>
        <button
          aria-label="Página anterior"
          disabled={currentPage === 1}
          type="button"
          onClick={() => goToPage(currentPage - 1)}
        >‹</button>
        <span>Página <strong>{currentPage}</strong> de {totalPages}</span>
        <button
          aria-label="Página siguiente"
          disabled={currentPage === totalPages}
          type="button"
          onClick={() => goToPage(currentPage + 1)}
        >›</button>
        <button
          aria-label="Última página"
          disabled={currentPage === totalPages}
          type="button"
          onClick={() => goToPage(totalPages)}
        >»</button>
      </div>
    </footer>
  );
}
