# API Editable Metadata Surface

This document lists the app metadata and store-asset areas that are editable through the public Apple and Google APIs, based on the official documentation reviewed on March 27, 2026.

Scope:
- app/store metadata and assets
- localized and non-localized surfaces
- public API-editable items only

Out of scope:
- binaries and track rollout mechanics except where directly tied to metadata
- in-app purchases and subscriptions
- account administration
- analytics and reporting

This document is intentionally conservative:
- `Confirmed` means the official docs reviewed clearly expose a writable public API path or request body.
- `Likely` means the reviewed docs strongly imply API support, but the exact writable field list was not fully visible from the sources reviewed.
- `Not confirmed` means the field exists in product/help docs, but public writable API support was not confirmed from the reviewed sources.

## Apple

### Localizable And Confirmed API-Editable

These are confirmed as part of the App Store Connect API metadata surface.

#### App info localization surface

- `name`
- `subtitle`

Resource model:
- `appInfoLocalizations`

Notes:
- These are shared app-info fields localized per locale.

#### App version localization surface

- `description`
- `keywords`
- `marketingUrl`
- `promotionalText`
- `supportUrl`
- `whatsNew`

Resource model:
- `appStoreVersionLocalizations`

Notes:
- These are localized per app version and locale.
- `whatsNew` is specifically version-oriented.

#### Localized visual assets

- screenshots
- app previews

Resource model:
- `appScreenshotSets`
- `appScreenshots`
- `appPreviewSets`
- `appPreviews`

Notes:
- These hang off app store version localizations.
- Screenshots are clearly part of the localized product-page surface.
- App previews are API-editable and are attached through preview sets.

### Non-Localized And Confirmed API-Editable

#### App store version surface

- `versionString`
- `copyright`
- `releaseType`
- `earliestReleaseDate`

Resource model:
- `appStoreVersions`

Notes:
- These are version-scoped rather than localization-scoped.

#### Build linkage

- attached build for a version

Resource model:
- `appStoreVersions/{id}/relationships/build`

Notes:
- This is not a textual metadata field, but it is part of the version configuration surface.

#### App review information

- `contactFirstName`
- `contactLastName`
- `contactPhone`
- `contactEmail`
- `demoAccountName`
- `demoAccountPassword`
- `demoAccountRequired`
- `notes`

Resource model:
- `appStoreReviewDetails`

#### Age rating declaration

Confirmed API-addressable fields include:
- `advertising`
- `alcoholTobaccoOrDrugUseOrReferences`
- `contests`
- `gambling`
- `gamblingSimulated`
- `gunsOrOtherWeapons`
- `healthOrWellnessTopics`
- `kidsAgeBand`
- `lootBox`
- `medicalOrTreatmentInformation`
- `messagingAndChat`
- `parentalControls`
- `profanityOrCrudeHumor`
- `ageAssurance`
- `sexualContentGraphicAndNudity`
- `sexualContentOrNudity`
- `horrorOrFearThemes`
- `matureOrSuggestiveThemes`
- `unrestrictedWebAccess`
- `userGeneratedContent`
- `violenceCartoonOrFantasy`
- `violenceRealisticProlongedGraphicOrSadistic`
- `violenceRealistic`
- `ageRatingOverride`
- `ageRatingOverrideV2`
- `koreaAgeRatingOverride`
- `developerAgeRatingInfoUrl`

Resource model:
- `ageRatingDeclarations`

#### Accessibility declarations

Confirmed API-addressable fields include:
- `deviceFamily`
- `state`
- `supportsAudioDescriptions`
- `supportsCaptions`
- `supportsDarkInterface`
- `supportsDifferentiateWithoutColorAlone`
- `supportsLargerText`
- `supportsReducedMotion`
- `supportsSufficientContrast`
- `supportsVoiceControl`
- `supportsVoiceover`

Resource model:
- `accessibilityDeclarations`

### Likely API-Editable, But Exact Writable Field List Not Fully Confirmed From Reviewed Sources

These appear to be API-addressable from the official docs reviewed, but the exact writable field list was not fully visible in the source snippets reviewed.

- primary category
- primary subcategories
- secondary category
- secondary subcategories

Resource hints:
- `appInfos`
- `appCategories`

Reason for caution:
- Apple’s category docs explicitly say to update categories through the `App Infos` resource, but the exact request schema was not fully visible in the reviewed sources.

### Not Confirmed From Reviewed Sources

These exist in Apple’s product/help documentation, but writable public API support was not confirmed from the reviewed sources.

- `privacyPolicyUrl`
- `privacyChoicesUrl`
- custom license agreement text
- app privacy questionnaire data types

Reason for caution:
- They may be writable through other public endpoints, but that was not confirmed from the sources reviewed for this document.

## Google Play

### Localizable And Confirmed API-Editable

#### Listing text

- `title`
- `shortDescription`
- `fullDescription`
- `video`

Resource model:
- `edits.listings`

Notes:
- The listing resource is locale-specific.
- `video` is the promotional YouTube URL in the listing resource.

#### Localized graphic assets

- `phoneScreenshots`
- `sevenInchScreenshots`
- `tenInchScreenshots`
- `tvScreenshots`
- `wearScreenshots`
- `icon`
- `featureGraphic`
- `tvBanner`

Resource model:
- `edits.images`
- `AppImageType`

Notes:
- The images API is language-scoped.
- This means screenshots and the listed graphic asset types are part of the localized editable API surface.

### Non-Localized And Confirmed API-Editable

- `defaultLanguage`
- `contactWebsite`
- `contactEmail`
- `contactPhone`

Resource model:
- `edits.details`

Notes:
- These are app-level details rather than locale-specific listing text.

### Explicitly Not Supported Or Not Fully Editable Through The Publishing API

The official Google docs explicitly note some limits.

Notable examples:
- legal consents required for publishing are not fillable through the API
- changing app state from published to unpublished is not supported through this API

## Practical V1 Implications For `storemeta`

### Safe V1 Metadata Surface To Target

Apple localized:
- `name`
- `subtitle`
- `description`
- `keywords`
- `marketingUrl`
- `promotionalText`
- `supportUrl`
- `whatsNew`
- screenshots
- app previews

Apple non-localized:
- `versionString`
- `copyright`
- app review details

Google localized:
- `title`
- `shortDescription`
- `fullDescription`
- `video`
- screenshots
- `icon`
- `featureGraphic`
- `tvBanner`

Google non-localized:
- `defaultLanguage`
- `contactWebsite`
- `contactEmail`
- `contactPhone`

### Recommended V1 Cut

For the first implementation, the lowest-risk confirmed API surface is:

Apple:
- app-info localization text
- app-version localization text
- screenshots

Google:
- listing text
- screenshots
- optionally `icon` and `featureGraphic`
- app details contact information

Everything beyond that should be implemented only after confirming the exact write semantics in code and tests.

## Sources

Apple:
- App information help: https://developer.apple.com/help/app-store-connect/reference/app-information/app-information
- Required, localizable, and editable properties: https://developer.apple.com/help/app-store-connect/reference/app-information/required-localizable-and-editable-properties
- App Store localizations: https://developer.apple.com/help/app-store-connect/reference/app-information/app-store-localizations
- App Store version localizations fields: https://developer.apple.com/documentation/appstoreconnectapi/appstoreversionlocalizationcreaterequest/data-data.dictionary/attributes-data.dictionary
- App Store review detail fields: https://developer.apple.com/documentation/appstoreconnectapi/appstorereviewdetail/attributes-data.dictionary
- App Store versions fields and related resources: https://developer.apple.com/documentation/appstoreconnectapi/get-v1-apps-_id_-appstoreversions
- App previews modify endpoint: https://developer.apple.com/documentation/appstoreconnectapi/patch-v1-apppreviews-_id_
- Build linkage endpoint: https://developer.apple.com/documentation/appstoreconnectapi/patch-v1-appstoreversions-_id_-relationships-build
- Categories overview: https://developer.apple.com/documentation/appstoreconnectapi/app-categories
- Accessibility declarations fields: https://developer.apple.com/documentation/appstoreconnectapi/get-v1-apps-_id_-accessibilitydeclarations
- Age rating modify endpoint: https://developer.apple.com/documentation/appstoreconnectapi/patch-v1-ageratingdeclarations-_id_

Google:
- Edits overview: https://developers.google.com/android-publisher/edits
- Listings resource: https://developers.google.com/android-publisher/api-ref/rest/v3/edits.listings
- Images resource: https://developers.google.com/android-publisher/api-ref/rest/v3/edits.images
- App image types: https://developers.google.com/android-publisher/api-ref/rest/v3/AppImageType
- App details resource: https://developers.google.com/android-publisher/api-ref/rest/v3/edits.details
