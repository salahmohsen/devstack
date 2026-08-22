import { SEARCH_ENTITY_ROUTES, type SearchEntityHit, type SearchEntityType } from "#@/search/types";

export function searchEntityHit(input: {
  type: SearchEntityType;
  id: string;
  label: string;
  sublabel?: string | null;
}): SearchEntityHit {
  const route = SEARCH_ENTITY_ROUTES[input.type];
  const sublabel = input.sublabel?.trim();
  return {
    type: input.type,
    id: input.id,
    label: input.label,
    sublabel: sublabel && sublabel.length > 0 ? sublabel : null,
    to: route.to,
    search: { [route.searchKey]: input.id }
  };
}
