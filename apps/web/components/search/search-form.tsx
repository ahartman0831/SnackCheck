interface SearchFormProps {
  defaultValue?: string;
  autoFocus?: boolean;
}

export function SearchForm({ defaultValue = "", autoFocus = false }: SearchFormProps) {
  return (
    <form action="/search" method="get" role="search" className="w-full">
      <label htmlFor="food-search" className="sr-only">
        Search a food or brand
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="food-search"
          name="q"
          type="search"
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          autoComplete="off"
          placeholder="Search a food or brand…"
          minLength={2}
          className="border-border bg-surface min-h-12 w-full rounded-2xl border px-4 text-base shadow-sm"
        />
        <button
          type="submit"
          className="bg-accent hover:bg-accent-strong text-on-accent min-h-12 min-w-11 rounded-2xl px-5 text-base font-semibold"
        >
          Search
        </button>
      </div>
    </form>
  );
}
