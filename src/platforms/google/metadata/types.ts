export interface GoogleStoreListing {
  title?: string;
  shortDescription?: string;
  fullDescription?: string;
  video?: string;
}

export interface GoogleStoreListingUpdate {
  language: string;
  body: GoogleStoreListing;
}
