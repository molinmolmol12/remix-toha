/**
 * Meta Ads API Service
 * Handles communication with Meta Graph API
 */

import { fetchWithRetry } from '../lib/api';

const GRAPH_API_VERSION = 'v19.0';
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface MetaAdAccount {
  id: string;
  name: string;
  currency: string;
}

export interface MetaCampaign {
  id: string;
  name: string;
  effective_status: string;
}

export interface MetaCampaignInsight {
  campaign_id: string;
  campaign_name: string;
  account_id: string;
  effective_status?: string;
  status?: string;
  spend: string;
  reach: string;
  impressions: string;
  cpm: string;
  cpp: string;
  ctr: string;
  clicks: string;
  inline_link_clicks: string;
  inline_link_click_ctr: string;
  outbound_clicks?: { action_type: string; value: string }[];
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
  cost_per_action_type?: { action_type: string; value: string }[];
  video_p25_watched_actions?: { action_type: string; value: string }[];
  video_p50_watched_actions?: { action_type: string; value: string }[];
  video_p75_watched_actions?: { action_type: string; value: string }[];
  video_p100_watched_actions?: { action_type: string; value: string }[];
}

export const fetchAdAccounts = async (accessToken: string): Promise<MetaAdAccount[]> => {
  try {
    const params = new URLSearchParams({
      fields: 'name,id,currency',
      access_token: accessToken
    });
    const data = await fetchWithRetry(`${BASE_URL}/me/adaccounts?${params.toString()}`);
    return data.data || [];
  } catch (error) {
    console.error('Error fetching ad accounts:', error);
    throw error;
  }
};

export const fetchCampaigns = async (adAccountId: string, accessToken: string): Promise<MetaCampaign[]> => {
  try {
    const params = new URLSearchParams({
      fields: 'name,id,effective_status',
      limit: '100',
      access_token: accessToken
    });
    const data = await fetchWithRetry(`${BASE_URL}/${adAccountId}/campaigns?${params.toString()}`);
    return data.data || [];
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    throw error;
  }
};

export const fetchCampaignInsights = async (
  adAccountId: string, 
  accessToken: string, 
  datePreset: string = 'today'
): Promise<MetaCampaignInsight[]> => {
  try {
    const fields = [
      'campaign_id',
      'campaign_name',
      'account_id',
      'spend',
      'reach',
      'impressions',
      'cpm',
      'cpp',
      'ctr',
      'clicks',
      'inline_link_clicks',
      'inline_link_click_ctr',
      'outbound_clicks',
      'actions',
      'action_values',
      'cost_per_action_type',
      'video_p25_watched_actions',
      'video_p50_watched_actions',
      'video_p75_watched_actions',
      'video_p100_watched_actions'
    ].join(',');

    const params = new URLSearchParams({
      level: 'campaign',
      fields: fields,
      date_preset: datePreset,
      limit: '100',
      access_token: accessToken
    });

    const data = await fetchWithRetry(`${BASE_URL}/${adAccountId}/insights?${params.toString()}`);
    return data.data || [];
  } catch (error) {
    console.error('Error fetching campaign insights:', error);
    throw error;
  }
};

export const fetchAccountInsights = async (
  adAccountId: string, 
  accessToken: string, 
  datePreset: string = 'today'
) => {
  try {
    const params = new URLSearchParams({
      fields: 'spend,reach,impressions,actions,action_values,cost_per_action_type',
      date_preset: datePreset,
      access_token: accessToken
    });
    const data = await fetchWithRetry(`${BASE_URL}/${adAccountId}/insights?${params.toString()}`);
    return data.data?.[0] || null;
  } catch (error) {
    console.error('Error fetching account insights:', error);
    throw error;
  }
};

export const fetchDailyInsights = async (
  adAccountId: string, 
  accessToken: string, 
  days: number = 7
) => {
  try {
    const params = new URLSearchParams({
      fields: 'spend,actions,action_values,date_start',
      date_preset: `last_${days}d`,
      time_increment: '1',
      access_token: accessToken
    });
    const data = await fetchWithRetry(`${BASE_URL}/${adAccountId}/insights?${params.toString()}`);
    return data.data || [];
  } catch (error) {
    console.error('Error fetching daily insights:', error);
    throw error;
  }
};

export const fetchHourlyInsights = async (
  adAccountId: string, 
  accessToken: string, 
  datePreset: string = 'today'
) => {
  try {
    const params = new URLSearchParams({
      fields: 'actions,action_values,date_start',
      date_preset: datePreset,
      breakdowns: 'hourly_stats_aggregated_by_advertiser_time_zone',
      access_token: accessToken
    });
    const data = await fetchWithRetry(`${BASE_URL}/${adAccountId}/insights?${params.toString()}`);
    return data.data || [];
  } catch (error) {
    console.error('Error fetching hourly insights:', error);
    throw error;
  }
};
