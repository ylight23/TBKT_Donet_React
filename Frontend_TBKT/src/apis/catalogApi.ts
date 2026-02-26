import { create } from "@bufbuild/protobuf";
import { catalogClient } from "../grpc/grpcClient";
import { officeClient } from "../grpc/grpcClient";

import type { Catalog, CatalogListRequest } from "../grpc/generated/Catalog_pb";
import { CatalogListRequestSchema } from "../grpc/generated/Catalog_pb";

// =====================
// Utils
// =====================


// =====================
// Types
// =====================
interface CatalogOptions {
    searchText?: string;
    inListIds?: string[];
}

// =====================
// API
// =====================
const catalogApi = {
    async getListCatalog(
        catalogName: string,
        options: CatalogOptions = {}
    ): Promise<Catalog[]> {
        try {
            const request = create(CatalogListRequestSchema, {
                catalogName: catalogName,
                searchText: options.searchText ?? "",
                inListIds: options.inListIds ?? [],
                onlyInListIds: !!options.inListIds?.length,
                extendedFields: [],
                includeFields: [],
            });

            const res = await catalogClient.getListCatalog(request);

            return res.items.map((item: Catalog) => item);
        } catch (err) {
            throw err;
        }
    },
};

export default catalogApi;
