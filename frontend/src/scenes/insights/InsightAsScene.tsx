import { BindLogic, BuiltLogic, Logic, LogicWrapper, useActions, useMountedLogic, useValues } from 'kea'
import { useEffect } from 'react'

import { LemonBanner, LemonButton } from '@posthog/lemon-ui'

import { AccessDenied } from 'lib/components/AccessDenied'
import { DebugCHQueries } from 'lib/components/AppShortcuts/utils/DebugCHQueries'
import { useFileSystemLogView } from 'lib/hooks/useFileSystemLogView'
import { useAttachedLogic } from 'lib/logic/scenes/useAttachedLogic'
import { InsightPageHeader } from 'scenes/insights/InsightPageHeader'
import { insightSceneLogic } from 'scenes/insights/insightSceneLogic'
import { ReloadInsight } from 'scenes/saved-insights/ReloadInsight'
import { filterTestAccountsDefaultsLogic } from 'scenes/settings/environment/filterTestAccountDefaultsLogic'
import { urls } from 'scenes/urls'

import { SceneContent } from '~/layout/scenes/components/SceneContent'
import { Query } from '~/queries/Query/Query'
import { getDefaultQuery } from '~/queries/nodes/InsightViz/utils'
import { Node } from '~/queries/schema/schema-general'
import { containsHogQLQuery, isInsightVizNode } from '~/queries/utils'
import { InsightShortId, InsightType, ItemMode } from '~/types'

import { teamLogic } from '../teamLogic'
import { InsightsNav } from './InsightNav/InsightsNav'
import { insightCommandLogic } from './insightCommandLogic'
import { insightDataLogic } from './insightDataLogic'
import { createEmptyInsight } from './insightLogic'
import { insightLogic } from './insightLogic'

export interface InsightAsSceneProps {
    insightId: InsightShortId | 'new'
    tabId: string
    attachTo?: BuiltLogic<Logic> | LogicWrapper<Logic>
}

export function InsightAsScene({ insightId, attachTo, tabId }: InsightAsSceneProps): JSX.Element | null {
    // insightSceneLogic
    const {
        insightMode,
        insight: sceneInsight,
        filtersOverride,
        variablesOverride,
        hasOverrides,
        freshQuery,
    } = useValues(insightSceneLogic)
    const { currentTeamId } = useValues(teamLogic)
    const { filterTestAccountsDefault } = useValues(filterTestAccountsDefaultsLogic)

    // Determine if this is a new insight
    const isNewInsight = insightId === 'new' || (insightId && insightId.startsWith('new-'))
    // Don't use cached insight if we're creating a new insight, even if insightSceneLogic has stale data
    // If the insight is unsaved, use it if we have overrides and the IDs match (to preserve unsaved work)
    // If the insight is saved, only use it if it's not a new insight, we have overrides, and the IDs match
    const matchesId = hasOverrides && sceneInsight?.short_id === insightId
    const cachedInsightToUse = matchesId && (!sceneInsight?.saved || !isNewInsight) ? sceneInsight : null

    const logic = insightLogic({
        dashboardItemId: insightId || `new-${tabId}`,
        tabId,
        // don't use cached insight if we have overrides or if we're creating a new insight
        cachedInsight: cachedInsightToUse,
        filtersOverride,
        variablesOverride,
    })
    const { insightProps, accessDeniedToInsight, insight } = useValues(logic)
    const { setInsight } = useActions(logic)

    // Reset insight when navigating to a new insight if the logic instance has stale data from a saved insight
    // Don't reset if the insight is unsaved - preserve user's work when navigating away and back
    useEffect(() => {
        if (
            isNewInsight &&
            insight?.short_id &&
            !insight.short_id.startsWith('new-') &&
            insight.short_id !== 'new' &&
            insight.saved
        ) {
            // The logic instance has a saved insight's data, but we're on a new insight - reset it
            // Only reset if the insight was saved (insight.saved === true)
            const query = getDefaultQuery(InsightType.TRENDS, filterTestAccountsDefault)
            setInsight(
                {
                    ...createEmptyInsight(insightId as InsightShortId),
                    query,
                },
                {
                    fromPersistentApi: false,
                    overrideQuery: true,
                }
            )
        }
    }, [insightId, isNewInsight, insight?.short_id, insight?.saved, setInsight, filterTestAccountsDefault])

    // Mount logics first to ensure they're initialized
    useMountedLogic(insightCommandLogic(insightProps))
    useAttachedLogic(logic, attachTo)
    useAttachedLogic(insightDataLogic(insightProps), attachTo)

    const { query, showQueryEditor, showDebugPanel } = useValues(insightDataLogic(insightProps))
    const { setQuery: setInsightQuery } = useActions(insightDataLogic(insightProps))

    useFileSystemLogView({
        type: 'insight',
        ref: insight?.short_id,
        enabled: Boolean(currentTeamId && insight?.short_id && insight?.saved && !accessDeniedToInsight),
        deps: [currentTeamId, insight?.short_id, insight?.saved, accessDeniedToInsight],
    })

    const actuallyShowQueryEditor = insightMode === ItemMode.Edit && showQueryEditor

    const setQuery = (q: Node | ((q: Node) => Node), isSourceUpdate?: boolean): void => {
        let node = typeof q === 'function' ? (query ? q(query) : null) : q
        if (!isInsightVizNode(node) || isSourceUpdate) {
            setInsightQuery(node)
        }
    }

    if (accessDeniedToInsight) {
        return <AccessDenied object="insight" />
    }

    if (!insight?.query) {
        return null
    }

    return (
        <BindLogic logic={insightLogic} props={insightProps}>
            <SceneContent className="Insight">
                <InsightPageHeader insightLogicProps={insightProps} />

                {hasOverrides && (
                    <LemonBanner type="warning" className="mb-4">
                        <div className="flex flex-row items-center justify-between gap-2">
                            <span>
                                You are viewing this insight with filter/variable overrides. Discard them to edit the
                                insight.
                            </span>

                            <LemonButton type="secondary" to={urls.insightView(insightId as InsightShortId)}>
                                Discard overrides
                            </LemonButton>
                        </div>
                    </LemonBanner>
                )}

                {insightMode === ItemMode.Edit && <InsightsNav />}

                {showDebugPanel && (
                    <div className="mb-4">
                        <DebugCHQueries insightId={insightProps.cachedInsight?.id} />
                    </div>
                )}

                {freshQuery ? <ReloadInsight /> : null}

                <Query
                    attachTo={attachTo}
                    query={isInsightVizNode(query) ? { ...query, full: true } : query}
                    setQuery={setQuery}
                    readOnly={insightMode !== ItemMode.Edit}
                    editMode={insightMode === ItemMode.Edit}
                    context={{
                        showOpenEditorButton: false,
                        showQueryEditor: actuallyShowQueryEditor,
                        showQueryHelp: insightMode === ItemMode.Edit && !containsHogQLQuery(query),
                        insightProps,
                    }}
                    filtersOverride={filtersOverride}
                    variablesOverride={variablesOverride}
                />
            </SceneContent>
        </BindLogic>
    )
}
