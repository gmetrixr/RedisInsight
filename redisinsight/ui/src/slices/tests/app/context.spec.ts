import { cloneDeep } from 'lodash'

import {
  cleanup,
  initialStateDefault,
  mockedStore,
} from 'uiSrc/utils/test-utils'
import reducer, {
  initialState,
  setAppContextInitialState,
  setAppContextConnectedInstanceId,
  setBrowserKeyListDataLoaded,
  setBrowserSelectedKey,
  setBrowserKeyListScrollPosition,
  setBrowserPanelSizes,
  setWorkbenchScript,
  setWorkbenchHorizontalPanelSizes,
  setWorkbenchVerticalPanelSizes,
  setLastPageContext,
  appContextSelector,
  appContextBrowser, appContextWorkbench
} from '../../app/context'

jest.mock('uiSrc/services')

let store: typeof mockedStore
beforeEach(() => {
  cleanup()
  store = cloneDeep(mockedStore)
  store.clearActions()
})

describe('slices', () => {
  describe('setAppContextInitialState', () => {
    it('should properly set initial state', () => {
      const nextState = reducer(initialState, setAppContextInitialState())
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })
      expect(appContextSelector(rootState)).toEqual(initialState)
    })
  })

  describe('setAppContextConnectedInstanceId', () => {
    it('should properly set id', () => {
      // Arrange
      const contextInstanceId = '12312-3123'
      const state = {
        ...initialState,
        contextInstanceId
      }

      // Act
      const nextState = reducer(initialState, setAppContextConnectedInstanceId(contextInstanceId))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextSelector(rootState)).toEqual(state)
    })
  })

  describe('setBrowserKeyListDataLoaded', () => {
    it('should properly set context is data loaded', () => {
      // Arrange
      const isDataLoaded = true
      const state = {
        ...initialState.browser,
        keyList: {
          ...initialState.browser.keyList,
          isDataLoaded
        }
      }

      // Act
      const nextState = reducer(initialState, setBrowserKeyListDataLoaded(isDataLoaded))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowser(rootState)).toEqual(state)
    })
  })

  describe('setBrowserSelectedKey', () => {
    it('should properly set selectedKey', () => {
      // Arrange
      const selectedKey = 'nameOfKey'
      const state = {
        ...initialState.browser,
        keyList: {
          ...initialState.browser.keyList,
          selectedKey
        }
      }

      // Act
      const nextState = reducer(initialState, setBrowserSelectedKey(selectedKey))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowser(rootState)).toEqual(state)
    })
  })

  describe('setBrowserKeyListScrollPosition', () => {
    it('should properly set scroll position of keyList', () => {
      // Arrange
      const scrollTopPosition = 530
      const state = {
        ...initialState.browser,
        keyList: {
          ...initialState.browser.keyList,
          scrollTopPosition
        }
      }

      // Act
      const nextState = reducer(initialState, setBrowserKeyListScrollPosition(scrollTopPosition))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowser(rootState)).toEqual(state)
    })
  })

  describe('setBrowserPanelSizes', () => {
    it('should properly set browser panel widths', () => {
      // Arrange
      const panelSizes = {
        first: 100,
        second: 200
      }
      const state = {
        ...initialState.browser,
        panelSizes
      }

      // Act
      const nextState = reducer(initialState, setBrowserPanelSizes(panelSizes))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextBrowser(rootState)).toEqual(state)
    })
  })

  describe('setWorkbenchScript', () => {
    it('should properly set workbench script', () => {
      // Arrange
      const script = 'set 1 1 // 215 hset 5 21'
      const state = {
        ...initialState.workbench,
        script
      }

      // Act
      const nextState = reducer(initialState, setWorkbenchScript(script))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextWorkbench(rootState)).toEqual(state)
    })
  })

  describe('setWorkbenchHorizontalPanelSizes', () => {
    it('should properly set wb panel sizes', () => {
      // Arrange
      const panelSizes = {
        first: 100,
        second: 200
      }
      const state = {
        ...initialState.workbench,
        panelSizes: {
          ...initialState.workbench.panelSizes,
          horizontal: panelSizes
        }
      }

      // Act
      const nextState = reducer(initialState, setWorkbenchHorizontalPanelSizes(panelSizes))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextWorkbench(rootState)).toEqual(state)
    })
  })

  describe('setWorkbenchVerticalPanelSizes', () => {
    it('should properly set wb panel sizes', () => {
      // Arrange
      const panelSizes = {
        first: 100,
        second: 200
      }
      const state = {
        ...initialState.workbench,
        panelSizes: {
          ...initialState.workbench.panelSizes,
          vertical: panelSizes
        }
      }

      // Act
      const nextState = reducer(initialState, setWorkbenchVerticalPanelSizes(panelSizes))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextWorkbench(rootState)).toEqual(state)
    })
  })

  describe('setLastPageContext', () => {
    it('should properly set last page', () => {
      // Arrange
      const lastPage = 'workbench'
      const state = {
        ...initialState,
        lastPage
      }

      // Act
      const nextState = reducer(initialState, setLastPageContext(lastPage))

      // Assert
      const rootState = Object.assign(initialStateDefault, {
        app: { context: nextState },
      })

      expect(appContextSelector(rootState)).toEqual(state)
    })
  })
})