import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'

import cx from 'classnames'
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiText,
  EuiToolTip,
  EuiTextColor,
} from '@elastic/eui'

import {
  cliSettingsSelector,
  deleteCliClientAction,
  toggleCli,
  toggleCliHelper,
} from 'uiSrc/slices/cli/cli-settings'
import { sendEventTelemetry, TelemetryEvent } from 'uiSrc/telemetry'
import { BrowserStorageItem } from 'uiSrc/constants'
import { sessionStorageService } from 'uiSrc/services'
import { connectedInstanceSelector } from 'uiSrc/slices/instances'

import styles from './styles.module.scss'

const CliHeader = () => {
  const dispatch = useDispatch()

  const { instanceId = '' } = useParams<{ instanceId: string }>()

  const { isShowHelper } = useSelector(cliSettingsSelector)
  const { host, port } = useSelector(connectedInstanceSelector)
  const endpoint = `${host}:${port}`

  const removeCliClient = () => {
    const cliClientUuid = sessionStorageService.get(BrowserStorageItem.cliClientUuid) ?? ''

    cliClientUuid && dispatch(deleteCliClientAction(instanceId, cliClientUuid))
  }

  useEffect(() => {
    window.addEventListener('beforeunload', removeCliClient, false)
    return () => {
      removeCliClient()
      window.removeEventListener('beforeunload', removeCliClient, false)
    }
  }, [])

  const handleCollapseCli = () => {
    sendEventTelemetry({
      event: TelemetryEvent.CLI_HIDDEN,
      eventData: {
        databaseId: instanceId
      }
    })
    dispatch(toggleCli())
  }

  const handleCollapseCliHelper = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation()
    sendEventTelemetry({
      event: isShowHelper ? TelemetryEvent.COMMAND_HELPER_COLLAPSED : TelemetryEvent.COMMAND_HELPER_EXPANDED,
      eventData: {
        databaseId: instanceId
      }
    })
    dispatch(toggleCliHelper())
  }

  return (
    <div className={styles.container} onClick={handleCollapseCli} id="cli-header">
      <EuiFlexGroup
        justifyContent="spaceBetween"
        gutterSize="none"
        alignItems="center"
        responsive={false}
        style={{ height: '100%', cursor: 'pointer' }}
      >
        <EuiFlexItem grow={false}>
          <EuiText>CLI</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow />
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={endpoint}
            position="bottom"
            display="inlineBlock"
            anchorClassName="flex-row"
          >
            <EuiText className={cx(styles.endpointContainer)} onClick={(e) => e.stopPropagation()}>
              <EuiTextColor color="subdued">Endpoint:</EuiTextColor>
              <EuiTextColor
                className={cx(styles.endpoint)}
                data-testid={`cli-endpoint-${endpoint}`}
              >
                {endpoint}
              </EuiTextColor>
            </EuiText>
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={`${isShowHelper ? 'Collapse' : 'Expand'} Command Helper`}
            position="top"
            display="inlineBlock"
            anchorClassName="flex-row"
          >
            <EuiButtonIcon
              iconType="questionInCircle"
              color={isShowHelper ? 'success' : 'primary'}
              id="collapse-cli-helper"
              aria-label="collapse cli helper"
              data-testid="collapse-cli-helper"
              className={cx(styles.icon, styles.iconHelper)}
              onClick={handleCollapseCliHelper}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content="Hide CLI"
            position="top"
            display="inlineBlock"
            anchorClassName="flex-row"
          >
            <EuiButtonIcon
              iconType="minus"
              color="primary"
              id="collapse-cli"
              aria-label="collapse cli"
              data-testid="collapse-cli"
              className={styles.icon}
              onClick={() => {}}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  )
}

export default CliHeader