import { getNoteShareUrl } from 'src/content-sharing/utils'
import type { AnnotationInterface } from './background/types'
import type { ContentSharingInterface } from 'src/content-sharing/background/types'
import type { Anchor } from 'src/highlighting/types'
import { copyToClipboard } from './content_script/utils'
import { shareOptsToPrivacyLvl } from './utils'
import type { AnnotationPrivacyLevels } from '@worldbrain/memex-common/lib/annotations/types'

export interface AnnotationShareOpts {
    shouldShare?: boolean
    shouldCopyShareLink?: boolean
    isBulkShareProtected?: boolean
    skipPrivacyLevelUpdate?: boolean
}

type AnnotationCreateData = {
    fullPageUrl: string
    pageTitle?: string
    localId?: string
    createdWhen?: Date
    selector?: Anchor
    localListIds?: number[]
} & ({ body: string; comment?: string } | { body?: string; comment: string })

interface AnnotationUpdateData {
    localId: string
    comment: string | null
}

export interface SaveAnnotationParams<
    T extends AnnotationCreateData | AnnotationUpdateData
> {
    annotationData: T
    annotationsBG: AnnotationInterface<'caller'>
    contentSharingBG: ContentSharingInterface
    shareOpts?: AnnotationShareOpts
    skipPageIndexing?: boolean
    keepListsIfUnsharing?: boolean
    skipListExistenceCheck?: boolean
    privacyLevelOverride?: AnnotationPrivacyLevels
}

export interface SaveAnnotationReturnValue {
    remoteAnnotationId: string | null
    savePromise: Promise<string>
}

export async function createAnnotation({
    annotationData,
    annotationsBG,
    contentSharingBG,
    skipPageIndexing,
    skipListExistenceCheck,
    privacyLevelOverride,
    shareOpts,
}: SaveAnnotationParams<AnnotationCreateData>): Promise<
    SaveAnnotationReturnValue
> {
    let remoteAnnotationId: string = null
    remoteAnnotationId = await contentSharingBG.generateRemoteAnnotationId()

    await copyToClipboard(getNoteShareUrl({ remoteAnnotationId }))
    if (shareOpts?.shouldShare) {
        if (shareOpts.shouldCopyShareLink) {
            try {
            } catch (e) {
                console.error(e)
            }
        }
    }

    return {
        remoteAnnotationId,
        savePromise: (async () => {
            const annotationUrl = await annotationsBG.createAnnotation(
                {
                    url: annotationData.localId,
                    createdWhen: annotationData.createdWhen,
                    pageUrl: annotationData.fullPageUrl,
                    selector: annotationData.selector,
                    title: annotationData.pageTitle,
                    comment: annotationData.comment
                        .replace(/\\\[/g, '[')
                        .replace(/\\\]/g, ']')
                        .replace(/\\\(/g, '(')
                        .replace(/\\\)/g, ')'),
                    body: annotationData.body,
                },
                { skipPageIndexing },
            )

            if (shareOpts?.shouldShare) {
                await contentSharingBG.shareAnnotation({
                    annotationUrl,
                    remoteAnnotationId,
                    shareToParentPageLists: false,
                    skipPrivacyLevelUpdate: true,
                })
            }

            await contentSharingBG.setAnnotationPrivacyLevel({
                annotationUrl,
                privacyLevel:
                    privacyLevelOverride ?? shareOptsToPrivacyLvl(shareOpts),
            })

            if (annotationData.localListIds?.length) {
                await contentSharingBG.shareAnnotationToSomeLists({
                    annotationUrl,
                    skipListExistenceCheck,
                    localListIds: annotationData.localListIds,
                })
            }

            const { remoteId } = await contentSharingBG.shareAnnotation({
                annotationUrl: annotationUrl,
                remoteAnnotationId: remoteAnnotationId,
                shareToParentPageLists: false,
                skipPrivacyLevelUpdate: true,
            })

            return annotationUrl
        })(),
    }
}

export async function updateAnnotation({
    annotationData,
    annotationsBG,
    contentSharingBG,
    shareOpts,
    keepListsIfUnsharing,
}: SaveAnnotationParams<AnnotationUpdateData>): Promise<
    SaveAnnotationReturnValue
> {
    let remoteAnnotationId: string = null
    if (shareOpts?.shouldShare) {
        const remoteAnnotMetadata = await contentSharingBG.getRemoteAnnotationMetadata(
            { annotationUrls: [annotationData.localId] },
        )

        remoteAnnotationId =
            (remoteAnnotMetadata[annotationData.localId]?.remoteId as string) ??
            (await contentSharingBG.generateRemoteAnnotationId())

        if (shareOpts.shouldCopyShareLink) {
            await copyToClipboard(getNoteShareUrl({ remoteAnnotationId }))
        }
    }

    return {
        remoteAnnotationId,
        savePromise: (async () => {
            if (annotationData.comment != null) {
                await annotationsBG.editAnnotation(
                    annotationData.localId,
                    annotationData.comment
                        .replace(/\\\[/g, '[')
                        .replace(/\\\]/g, ']')
                        .replace(/\\\(/g, '(')
                        .replace(/\\\)/g, ')'),
                )
            }

            await Promise.all([
                shareOpts?.shouldShare &&
                    contentSharingBG.shareAnnotation({
                        remoteAnnotationId,
                        annotationUrl: annotationData.localId,
                        shareToParentPageLists: true,
                    }),
                !shareOpts?.skipPrivacyLevelUpdate &&
                    contentSharingBG.setAnnotationPrivacyLevel({
                        annotationUrl: annotationData.localId,
                        privacyLevel: shareOptsToPrivacyLvl(shareOpts),
                        keepListsIfUnsharing,
                    }),
            ])
            return annotationData.localId
        })(),
    }
}
