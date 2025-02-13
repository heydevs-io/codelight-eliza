import { createRequire } from 'module';
//import { HttpService } from '@nestjs/axios';
//import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { firstValueFrom, catchError } from 'rxjs';
import { AxiosError } from 'axios';
import { Tweet } from 'agent-twitter-client';
import fetch from 'node-fetch';
import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';
const require = createRequire(import.meta.url);

// Use require to import CommonJS modules
const util = require('util');
const combinedStream = require('combined-stream');
const formData = require('form-data');

const x_app_code = process.env.X_APP_CODE;
const Email = process.env.EMAIL;
const code_workflow = process.env.CODE_WORKFLOW;
const dataset_id = process.env.DATASET_ID;

const emailLogin = process.env.EMAIL_LOGIN;

async function getDifyToken(): Promise<string> {
    //console.log("hello");
    //console.log("x_app_code:", x_app_code);
    //console.log("email:", email);
    const response = await fetch(
          'https://dev.dify-api.nimspace.com/v1/codelight/passport',
          {
            method: 'POST',
            body: JSON.stringify({
                email: Email
            }),
            headers: {
              'X-App-Code': x_app_code,
              'Content-Type': 'application/json',
              'Accept': '*/*',
              'Accept-Encoding': 'gzip, deflate, br',
              'Connection': 'keep-alive',
            }
          }
        );
    const data = await response.json(); // Resolve the promise
    //console.log("data:", data);
    const accessToken = data.access_token; // Access the access_token property
    //console.log("accessToken:", accessToken);
    return accessToken;
}

export async function callDifyAI(context: string, conversationId: string, messageId: string): Promise<any> {
    try {
        const accessToken = await getDifyToken();
        // console.log("accessToken:", accessToken);
        // console.log("info conversationId:", conversationId);
        // console.log("info messageId:", messageId);
        const Query = "Reply this comment :" + context;
        //console.log("context:", context);
        const response = await fetch('https://dev.dify-api.nimspace.com/api/chat-messages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                response_mode: "blocking",
                conversation_id: conversationId,
                files: [],
                query: Query,
                inputs: {
                    agent_name: "Brian",
                twitter_user_name: "brian_d_wilson"
                },
                parent_message_id: messageId
            }),
        }
        );
        //console.log("response status:", response.status);
        const data = await response.json();
        //console.log("response:", data);
        //tweet.messageId_Dify = data.message_id;

        //return response.data.reply;
        return data;
    } catch (error) {
        console.error('Error calling Dify AI API:', error);
        throw new Error('Failed to get response from Dify AI');
    }
}

export async function buildConversation_Dify(): Promise<any> {
    const text = "Write a post for me ";
    const accessToken = await getDifyToken();
    const response = await fetch('http://dev.dify-api.nimspace.com/api/chat-messages', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            response_mode: "blocking",
            conversation_id: "",
            files: [],
            query: text,
            inputs: {
                agent_name: "Brian",
                twitter_user_name: "brian_d_wilson"
            },
            parent_message_id: null
        }),
    }
    );
    const data = await response.json();
    const info = {
        text: data.answer,
        conversationId: data.conversation_id,
        messageId: data.message_id
    };
    // tweet.conversationId_Dify = data.conversation_id;
    // tweet.messageId_Dify = data.message_id;
    return info;
}
async function ConnectDify(): Promise<any> {
    console.log("emailLogin", emailLogin);
    const response = await fetch(
        'https://dev.dify-api.nimspace.com/v1/codelight/login-without-password',
        {
          method: 'POST',
          body: JSON.stringify({
              email: emailLogin
          }),
          headers: {
            'x-inner-api-key': "dify-sandbox",
            'Content-Type': 'application/json',
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
          }
        }
      );
      const data = await response.json();
      console.log("data", data);
      const accessToken = data.data;
      console.log("accessToken", accessToken);
      return accessToken;

}
export async function getConversationDify(conversationId: string): Promise<any> {
    console.log("conversationId", conversationId);
    console.log("code_workflow", code_workflow);
    const url = `https://dev.dify-api.nimspace.com/console/api/apps/${code_workflow}/chat-messages?conversation_id=${conversationId}&limit=10`;
    const Token = await ConnectDify();
    console.log("Token", Token);
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${Token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Error fetching conversation: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error in getConversationDify:', error);
        throw error;
    }
}


// export async function uploadFile(filePath: string): Promise<string> {
//     const accessToken = await getDifyToken();
//     const url = 'https://dev.dify-api.nimspace.com/console/api/files/upload?source=datasets';
//     const form = new FormData();
//     form.append('file', fs.createReadStream(filePath));

//     const response = await fetch(url, {
//         method: 'POST',
//         headers: {
//             'Authorization': `Bearer ${accessToken}`,
//             ...form.getHeaders()
//         },
//         body: form
//     });

//     if (!response.ok) {
//         throw new Error(`Error uploading file: ${response.statusText}`);
//     }

//     const data = await response.json();
//     return data.file_id; // Assuming the response contains a file_id
// }

export async function addDocumentToDataset(fileId: string): Promise<void> {
    const accessToken = await getDifyToken();
    const url = `https://dev.dify-api.nimspace.com/console/api/datasets/${dataset_id}/documents`;
    const body = {
        data_source: {
            type: "upload_file",
            info_list: {
                data_source_type: "upload_file",
                file_info_list: {
                    file_ids: [fileId]
                }
            }
        },
        indexing_technique: "high_quality",
        process_rule: {
            rules: {},
            mode: "automatic"
        },
        doc_form: "text_model",
        doc_language: "English",
        retrieval_model: {
            search_method: "semantic_search",
            reranking_enable: false,
            reranking_mode: null,
            reranking_model: {
                reranking_provider_name: null,
                reranking_model_name: null
            },
            weights: null,
            top_k: 3,
            score_threshold_enabled: false,
            score_threshold: 0.5
        },
        embedding_model: "text-embedding-3-large",
        embedding_model_provider: "openai"
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`Error adding document to dataset: ${response.statusText}`);
    }
}

// export async function hello(): Promise<void> {
//     const cheer = await axios.get('http://localhost:3000/hello');
//     return cheer.data;
// }