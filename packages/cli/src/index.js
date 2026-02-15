#!/usr/bin/env node

import { Command } from 'commander';
import { ChatClient } from '@chat/sdk';
import { createInterface } from 'readline';
import chalk from 'chalk';

const program = new Command();

program
    .name('chat')
    .description('CLI for making OpenAI completions with MCP tools')
    .version('1.0.0')
    .option('-k, --api-key <key>', 'OpenAI API key (or set OPENAI_API_KEY env)')
    .option('-m, --model <model>', 'Model to use', 'o3-mini')
    .option('-s, --mcp-server <url>', 'MCP server URL', 'https://cool.cloudpilot.com.br/mcp')
    .option('-i, --interactive', 'Start an interactive chat session')
    .argument('[input...]', 'Input text for one-shot completion');

program.action(async (inputParts, options) => {
    const apiKey = options.apiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.error(chalk.red('Error: OpenAI API key is required.'));
        console.error(chalk.dim('Use --api-key <key> or set OPENAI_API_KEY environment variable.'));
        process.exit(1);
    }

    const client = new ChatClient({
        apiKey,
        model: options.model,
        mcpServerUrl: options.mcpServer,
    });

    if (options.interactive) {
        await interactiveMode(client);
    } else {
        const input = inputParts.join(' ');
        if (!input) {
            console.error(chalk.red('Error: Provide input text or use --interactive mode.'));
            process.exit(1);
        }
        await oneShot(client, input);
    }
});

async function oneShot(client, input) {
    try {
        console.log(chalk.dim('⏳ Sending request...'));
        const result = await client.chat(input);
        console.log();
        console.log(chalk.green('✅ Response:'));
        console.log(result.outputText);
        console.log();
        console.log(chalk.dim(`Model: ${result.model} | MCP: ${result.mcpServerUrl} | Tools: ${result.toolsDiscovered.join(', ')}`));
        if (result.usage) {
            console.log(chalk.dim(`Tokens — input: ${result.usage.input_tokens}, output: ${result.usage.output_tokens}`));
        }
    } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
    }
}

async function interactiveMode(client) {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    console.log(chalk.bold.cyan('🤖 Interactive Chat'));
    console.log(chalk.dim(`Model: ${client.config.model} | MCP: ${client.config.mcpServerUrl}`));
    console.log(chalk.dim('Type "exit" to quit, "reset" to start a new conversation.\n'));

    const prompt = () => {
        rl.question(chalk.bold.blue('You: '), async (input) => {
            const trimmed = input.trim();
            if (!trimmed) return prompt();

            if (trimmed.toLowerCase() === 'exit') {
                console.log(chalk.dim('Goodbye!'));
                rl.close();
                return;
            }

            if (trimmed.toLowerCase() === 'reset') {
                client.resetConversation();
                console.log(chalk.yellow('🔄 Conversation reset.\n'));
                return prompt();
            }

            try {
                console.log(chalk.dim('⏳ Thinking...'));
                const result = await client.chat(trimmed);
                console.log(chalk.bold.green('AI: ') + result.outputText);
                if (result.usage) {
                    console.log(chalk.dim(`  [tokens: in=${result.usage.input_tokens} out=${result.usage.output_tokens}]`));
                }
                console.log();
            } catch (err) {
                console.error(chalk.red(`Error: ${err.message}`));
            }

            prompt();
        });
    };

    prompt();
}

program.parse();
