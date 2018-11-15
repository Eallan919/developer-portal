import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';

import { IApiList, IErrorableInput, IRootState } from '../types';
import * as constants from '../types/constants';

const EMAIL_REGEX = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export interface IUpdateApplicationFirstName extends Action {
  newValue: IErrorableInput;
  type: constants.UPDATE_APPLICATION_FIRST_NAME;
}

export interface IUpdateApplicationLastName extends Action {
  newValue: IErrorableInput;
  type: constants.UPDATE_APPLICATION_LAST_NAME;
}

export interface IUpdateApplicationEmail extends Action {
  newValue: IErrorableInput;
  type: constants.UPDATE_APPLICATION_EMAIL;
}

export interface IUpdateApplicationOrganization extends Action {
  newValue: IErrorableInput;
  type: constants.UPDATE_APPLICATION_ORGANIZATION;
}

export interface IUpdateApplicationDescription extends Action {
  newValue: IErrorableInput;
  type: constants.UPDATE_APPLICATION_DESCRIPTION;
}

export interface IToggleBenefitsApi extends Action {
  type: constants.TOGGLE_BENEFITS_CHECKED;
}

export interface IToggleAppealsApi extends Action {
  type: constants.TOGGLE_APPEALS_CHECKED;
}

export interface IToggleHealthApi extends Action {
  type: constants.TOGGLE_HEALTH_CHECKED;
}

export interface IToggleFacilitiesApi extends Action {
  type: constants.TOGGLE_FACILITIES_CHECKED;
}

export interface IToggleVerificationApi extends Action {
  type: constants.TOGGLE_VERIFICATION_CHECKED;
}

export type UpdateApplicationAction =
  IUpdateApplicationDescription |
  IUpdateApplicationEmail |
  IUpdateApplicationFirstName |
  IUpdateApplicationLastName |
  IUpdateApplicationOrganization |
  IToggleBenefitsApi |
  IToggleAppealsApi |
  IToggleVerificationApi |
  IToggleFacilitiesApi |
  IToggleHealthApi;

export interface ISubmitForm extends Action {
  type: constants.SUBMIT_APPLICATION_BEGIN;
}

export interface ISubmitFormSuccess extends Action {
  type: constants.SUBMIT_APPLICATION_SUCCESS;
  token: string;
}

export interface ISubmitFormError extends Action {
  type: constants.SUBMIT_APPLICATION_ERROR;
  status: string;
}

export type SubmitFormAction = ISubmitForm | ISubmitFormSuccess | ISubmitFormError;

export type SubmitFormThunk = ThunkAction<Promise<SubmitFormAction>, IRootState, undefined, SubmitFormAction>;

export interface IFetchArgonaut extends Action {
  type: constants.FETCH_ARGONAUT_BEGIN;
}

export interface IFetchArgonautSuccess extends Action {
  swagger: object;
  type: constants.FETCH_ARGONAUT_SUCCESS;
}

export interface IFetchArgonautError extends Action {
  error: string;
  type: constants.FETCH_ARGONAUT_ERROR;
}

export type FetchArgonautAction = IFetchArgonaut | IFetchArgonautSuccess | IFetchArgonautError;

export type FetchArgonautThunk = ThunkAction<Promise<FetchArgonautAction>, IRootState, undefined, FetchArgonautAction>;

const apisToList = (apis : IApiList) => {
  return Object.keys(apis).filter((key) => apis[key]).join(',');
};

const MAX_RETRIES = 3;

const fetchWithRetry = (fetchFn : () => Promise<Response>, retries = 0, status = '') : Promise<Response> => {
  if (retries > MAX_RETRIES) {
    throw new Error(`Max Retries Exceeded. Last Status: ${status}`);
  }
  return fetchFn()
    .then((response) => response.ok ? response : fetchWithRetry(fetchFn, retries + 1, response.statusText))
    .catch((err) => fetchWithRetry(fetchFn, retries + 1, err.message));
};

export const submitForm : ActionCreator<SubmitFormThunk> = () => {
  return (dispatch, state) => {
    dispatch(submitFormBegin());

    const { application } = state();
    const applicationBody : any = {};
    applicationBody.apis = apisToList(application.apis);
    ['description', 'email', 'firstName', 'lastName', 'organization'].forEach((property) => {
      if (application[property]) {
        applicationBody[property] = application[property].value;
      }
    });

    const request = new Request(
      `${process.env.REACT_APP_DEVELOPER_PORTAL_SELF_SERVICE_URL}/services/meta/developer_application`,
      {
        body: JSON.stringify(applicationBody),
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json'
        },
        method: 'POST',
      }
    );
    return fetchWithRetry(() => fetch(request))
      .then((response) => {
        if (!response.ok) {
          throw Error(response.statusText)
        }
        return response;
      })
      .then((response) => response.json())
      .then((json) => {
        if (json.token) {
          return dispatch(submitFormSuccess(json.token));
        } else {
          return dispatch(submitFormError(json.errorMessage));
        }
      })
      .catch((error) => dispatch(submitFormError(error.message)));
  };
}

export const submitFormBegin : ActionCreator<ISubmitForm> = () => {
  return {
    type: constants.SUBMIT_APPLICATION_BEGIN
  };
}

export const submitFormSuccess : ActionCreator<ISubmitFormSuccess> = (token : string) => {
  return {
    token,
    type: constants.SUBMIT_APPLICATION_SUCCESS,
  };
}

export const submitFormError : ActionCreator<ISubmitFormError> = (status : string) => {
  return {
    status,
    type: constants.SUBMIT_APPLICATION_ERROR,
  };
}

export const fetchArgonaut : ActionCreator<FetchArgonautThunk> = () => {
  return (dispatch) => {
    dispatch(fetchArgonautBegin());

    return fetch('https://vdgr16jtej.execute-api.us-east-1.amazonaws.com/prod/catalog')
      .then((response) => {
        if (!response.ok) {
          throw Error(response.statusText);
        }
        return response;
      })
      .then((response) => response.json())
      .then((json) => dispatch(fetchArgonautSuccess(json[1].apis[0].swagger)))
      .catch((error) => dispatch(fetchArgonautError(error.message)));
  };
}

export const fetchArgonautBegin : ActionCreator<IFetchArgonaut> = () => {
  return {
    type: constants.FETCH_ARGONAUT_BEGIN
  };
}

export const fetchArgonautSuccess : ActionCreator<IFetchArgonautSuccess> = (swagger: object) => {
  return {
    swagger,
    type: constants.FETCH_ARGONAUT_SUCCESS,
  };
}

export const fetchArgonautError : ActionCreator<IFetchArgonautError> = (error: string) => {
  return {
    error,
    type: constants.FETCH_ARGONAUT_ERROR,
  };
}

export const validateEmail = (newValue: IErrorableInput) => {
  const invalid = !newValue.value.match(EMAIL_REGEX);
  if (invalid) {
    newValue.validation = "Must be a valid email address."
  }
  return newValue;
}

export const updateApplicationEmail : ActionCreator<IUpdateApplicationEmail> = (newValue: IErrorableInput) => {
  return {
    newValue: validateEmail(newValue),
    type: constants.UPDATE_APPLICATION_EMAIL,
  }
}

export const updateApplicationDescription : ActionCreator<IUpdateApplicationDescription> = (newValue: IErrorableInput) => {
  return {
    newValue,
    type: constants.UPDATE_APPLICATION_DESCRIPTION,
  }
}

export const updateApplicationFirstName : ActionCreator<IUpdateApplicationFirstName> = (newValue: IErrorableInput) => {
  return {
    newValue,
    type: constants.UPDATE_APPLICATION_FIRST_NAME,
  }
}

export const updateApplicationLastName : ActionCreator<IUpdateApplicationLastName> = (newValue: IErrorableInput) => {
  return {
    newValue,
    type: constants.UPDATE_APPLICATION_LAST_NAME,
  }
}

export const updateApplicationOrganization : ActionCreator<IUpdateApplicationOrganization> = (newValue: IErrorableInput) => {
  return {
    newValue,
    type: constants.UPDATE_APPLICATION_ORGANIZATION,
  }
}

export const toggleBenefitsApi : ActionCreator<IToggleBenefitsApi> = () =>  {
  return {
    type: constants.TOGGLE_BENEFITS_CHECKED,
  }
}

export const toggleAppealsApi : ActionCreator<IToggleAppealsApi> = () => {
  return {
    type: constants.TOGGLE_APPEALS_CHECKED,
  }
}

export const toggleHealthApi : ActionCreator<IToggleHealthApi> = () => {
  return {
    type: constants.TOGGLE_HEALTH_CHECKED,
  }
}

export const toggleVerificationApi : ActionCreator<IToggleVerificationApi> = () => {
  return {
    type: constants.TOGGLE_VERIFICATION_CHECKED,
  }
}

export const toggleFacilitiesApi : ActionCreator<IToggleFacilitiesApi> = () => {
  return {
    type: constants.TOGGLE_FACILITIES_CHECKED,
  }
}