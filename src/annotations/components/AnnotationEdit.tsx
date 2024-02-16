import * as React from 'react'
import styled from 'styled-components'

import { getKeyName } from '@worldbrain/memex-common/lib/utils/os-specific-key-names'
import MemexEditor, {
    MemexEditorInstance,
} from '@worldbrain/memex-common/lib/editor'
import { getKeyboardShortcutsState } from 'src/in-page-ui/keyboard-shortcuts/content_script/detection'
import { YoutubePlayer } from '@worldbrain/memex-common/lib/services/youtube/types'
import { ImageSupportInterface } from 'src/image-support/background/types'
import { TaskState } from 'ui-logic-core/lib/types'

interface State {
    editorHeight: string
    youtubeShortcut: string | null
}

export interface AnnotationEditEventProps {
    onEditConfirm: (
        showExternalConfirmations?: boolean,
    ) => (
        shouldShare: boolean,
        isProtected: boolean,
        opts?: {
            mainBtnPressed?: boolean
            keepListsIfUnsharing?: boolean
        },
    ) => void
    onEditCancel: () => void
    onCommentChange: (comment: string) => void
    onBodyChange: (body: string) => void
    onListsBarPickerBtnClick: React.MouseEventHandler
    imageSupport: ImageSupportInterface<'caller'>
    isLoading: TaskState
}

export interface AnnotationEditGeneralProps {
    comment: string
    body: string
    editorHeight?: string
    isShared?: boolean
    isBulkShareProtected?: boolean
    getYoutubePlayer?(): YoutubePlayer
    contextLocation?: string
    selector?: string
    getRootElement: () => HTMLElement
    slimEditorActions?: boolean
}

export interface Props
    extends AnnotationEditEventProps,
        AnnotationEditGeneralProps {
    rows: number
}

class AnnotationEdit extends React.Component<Props> {
    static MOD_KEY = getKeyName({ key: 'mod' })

    state: State = {
        editorHeight: '50px',
        youtubeShortcut: null,
    }

    async componentDidMount() {
        await this.youtubeKeyboardShortcut()
    }

    private editorRef: MemexEditorInstance

    focusEditor() {
        this.editorRef?.focus()
    }

    private saveEdit(shouldShare, isProtected) {
        this.props.onEditConfirm(true)(shouldShare, isProtected)
        //AnnotationEditable.removeMarkdownHelp()
    }

    private handleInputKeyDown: React.KeyboardEventHandler = (e) => {
        e.stopPropagation()

        if (navigator.platform === 'MacIntel') {
            if (e.key === 'Enter' && e.shiftKey && e.metaKey) {
                e.stopPropagation()
                e.preventDefault()
                return this.saveEdit(true, false)
            }

            if (e.key === 'Enter' && e.shiftKey && e.altKey) {
                e.stopPropagation()
                e.preventDefault()
                return this.saveEdit(true, true)
            }

            if (e.key === 'Enter' && e.altKey) {
                e.stopPropagation()
                e.preventDefault()
                return this.saveEdit(false, true)
            }

            if (e.key === 'Enter' && e.metaKey) {
                e.stopPropagation()
                e.preventDefault()
                return this.props.onEditConfirm(false)(
                    this.props.isShared,
                    this.props.isBulkShareProtected,
                    { mainBtnPressed: true },
                )
            }
        } else {
            if (e.key === 'Enter' && e.shiftKey && e.ctrlKey) {
                return this.saveEdit(true, false)
            }

            if (e.key === 'Enter' && e.shiftKey && e.altKey) {
                return this.saveEdit(true, true)
            }

            // if (e.key === 'Enter' && e.altKey) {
            //     return this.saveEdit(false, true)
            // }

            if (e.key === 'Enter' && e.ctrlKey) {
                return this.saveEdit(false, false)
            }
        }

        if (e.key === 'Escape') {
            this.props.onEditCancel()
            return
        }
    }

    private youtubeKeyboardShortcut = async () => {
        const shortcuts = await getKeyboardShortcutsState()
        const youtubeShortcut = shortcuts.createAnnotation.shortcut
        this.setState({ youtubeShortcut })
    }

    render() {
        return (
            <EditorContainer>
                <MemexEditor
                    getYoutubePlayer={this.props.getYoutubePlayer}
                    onContentUpdate={(content) =>
                        this.props.onCommentChange(content)
                    }
                    markdownContent={this.props.comment}
                    onKeyDown={this.handleInputKeyDown}
                    placeholder={`Add Note. Click on ( ? ) for formatting help.`}
                    setEditorInstanceRef={(ref) => (this.editorRef = ref)}
                    autoFocus
                    youtubeShortcut={this.state.youtubeShortcut}
                    imageSupport={this.props.imageSupport}
                    getRootElement={this.props.getRootElement}
                    slimEditorActions={this.props.slimEditorActions}
                />
            </EditorContainer>
        )
    }
}

export default AnnotationEdit

const EditorContainer = styled.div`
    height: fit-content;
    padding: 0 10px 10px 10px;
    // transition: height 1s ease-in-out;
    // border-top: 1px solid ${(props) => props.theme.colors.greyScale3};

    &:first-child {
        border-top: none;
    }
`
