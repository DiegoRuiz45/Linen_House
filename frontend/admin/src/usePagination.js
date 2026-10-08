import { useState } from "react";


export const PAGE_SIZE_OPTIONS = [10, 50, 100];


export default function usePagination(items) {
  const list = Array.isArray(items) ? items : [];
  const [pageSize, setPageSizeState] = useState(PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const firstIndex = (currentPage - 1) * pageSize;
  const lastIndex = Math.min(firstIndex + pageSize, totalItems);

  const setPageSize = (value) => {
    const nextSize = Number(value);
    setPageSizeState(
      PAGE_SIZE_OPTIONS.includes(nextSize)
        ? nextSize
        : PAGE_SIZE_OPTIONS[0],
    );
    setPage(1);
  };

  const goToPage = (value) => {
    const nextPage = Number(value);
    setPage(Math.max(1, Math.min(nextPage, totalPages)));
  };

  return {
    currentPage,
    firstItem: totalItems === 0 ? 0 : firstIndex + 1,
    goToPage,
    items: list.slice(firstIndex, lastIndex),
    lastItem: lastIndex,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
  };
}
