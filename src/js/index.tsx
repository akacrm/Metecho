import actionSprite from '@salesforce-ux/design-system/assets/icons/action-sprite/svg/symbols.svg';
import customSprite from '@salesforce-ux/design-system/assets/icons/custom-sprite/svg/symbols.svg';
import doctypeSprite from '@salesforce-ux/design-system/assets/icons/doctype-sprite/svg/symbols.svg';
import standardSprite from '@salesforce-ux/design-system/assets/icons/standard-sprite/svg/symbols.svg';
import utilitySprite from '@salesforce-ux/design-system/assets/icons/utility-sprite/svg/symbols.svg';
import IconSettings from '@salesforce/design-system-react/components/icon-settings';
import settings from '@salesforce/design-system-react/components/settings';
import i18n from 'i18next';
import React, { useEffect } from 'react';
import DocumentTitle from 'react-document-title';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import {
  BrowserRouter,
  Redirect,
  Route,
  RouteComponentProps,
  Switch,
  withRouter,
} from 'react-router-dom';
import { AnyAction, applyMiddleware, createStore, Dispatch } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import logger from 'redux-logger';
import thunk, { ThunkDispatch } from 'redux-thunk';

import FourOhFour from '@/components/404';
import ErrorBoundary from '@/components/error';
import Footer from '@/components/footer';
import Header from '@/components/header';
import ProductDetail from '@/components/products/detail';
import ProductList from '@/components/products/list';
import AuthError from '@/components/user/authError';
import Login from '@/components/user/login';
import { PrivateRoute } from '@/components/utils';
import initializeI18n from '@/i18n';
import reducer from '@/store';
import { fetchObjects } from '@/store/actions';
import { clearErrors } from '@/store/errors/actions';
import { login, refetchAllData } from '@/store/user/actions';
import { OBJECT_TYPES } from '@/utils/constants';
import { log, logError } from '@/utils/logging';
import routes, { routePatterns } from '@/utils/routes';
import { createSocket } from '@/utils/websockets';
import SFLogo from '#/salesforce-logo.png';

const App = withRouter(
  ({
    dispatch,
    location: { pathname },
  }: { dispatch: Dispatch } & RouteComponentProps) => {
    useEffect(
      () => () => {
        dispatch(clearErrors());
      },
      [dispatch, pathname],
    );

    return (
      <DocumentTitle title={i18n.t('MetaShare')}>
        <div className="slds-grid slds-grid_frame slds-grid_vertical">
          <ErrorBoundary>
            <Header />
            <div className="slds-grow slds-shrink-none">
              <ErrorBoundary>
                <Switch>
                  <Route exact path={routePatterns.login()} component={Login} />
                  <Route
                    exact
                    path={routePatterns.home()}
                    render={() => <Redirect to={routes.product_list()} />}
                  />
                  <PrivateRoute
                    exact
                    path={routePatterns.product_list()}
                    component={ProductList}
                  />
                  <PrivateRoute
                    exact
                    path={routePatterns.product_detail()}
                    component={ProductDetail}
                  />
                  <Route
                    path={routePatterns.auth_error()}
                    component={AuthError}
                  />
                  <PrivateRoute component={FourOhFour} />
                </Switch>
              </ErrorBoundary>
            </div>
            <Footer logoSrc={SFLogo} />
          </ErrorBoundary>
        </div>
      </DocumentTitle>
    );
  },
);

initializeI18n((i18nError?: string) => {
  if (i18nError) {
    log(i18nError);
  }
  const el = document.getElementById('app');
  if (el) {
    // Create store
    const appStore = createStore(
      reducer,
      {},
      composeWithDevTools(applyMiddleware(thunk, logger)),
    );

    // Connect to WebSocket server
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    window.socket = createSocket({
      url: `${protocol}//${host}${window.api_urls.ws_notifications()}`,
      dispatch: appStore.dispatch,
      options: {
        onreconnect: () => {
          (appStore.dispatch as ThunkDispatch<any, void, AnyAction>)(
            refetchAllData(),
          );
        },
      },
    });

    // Get JS globals
    let GLOBALS = {};
    try {
      const globalsEl = document.getElementById('js-globals');
      if (globalsEl && globalsEl.textContent) {
        GLOBALS = JSON.parse(globalsEl.textContent);
      }
    } catch (err) {
      logError(err);
    }
    window.GLOBALS = GLOBALS;

    // Get logged-in/out status
    let user;
    const userString = el.getAttribute('data-user');
    if (userString) {
      try {
        user = JSON.parse(userString);
      } catch (err) {
        // swallow error
      }
      if (user) {
        // Login
        appStore.dispatch(login(user));
      }
    }
    el.removeAttribute('data-user');

    // Set App element (used for react-SLDS modals)
    settings.setAppElement(el);

    const renderApp = () => {
      ReactDOM.render(
        <Provider store={appStore}>
          <BrowserRouter>
            <IconSettings
              actionSprite={actionSprite}
              customSprite={customSprite}
              doctypeSprite={doctypeSprite}
              standardSprite={standardSprite}
              utilitySprite={utilitySprite}
            >
              <App dispatch={appStore.dispatch} />
            </IconSettings>
          </BrowserRouter>
        </Provider>,
        el,
      );
    };

    // If logged in, fetch products before rendering App
    if (user) {
      (appStore.dispatch as ThunkDispatch<any, void, AnyAction>)(
        fetchObjects({ objectType: OBJECT_TYPES.PRODUCT, reset: true }),
      ).finally(renderApp);
    } else {
      renderApp();
    }
  }
});