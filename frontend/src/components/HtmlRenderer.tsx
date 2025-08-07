import React from 'react';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

interface QCodeBlockProps {
    blockId: string;
    codeElement: Element;
    onApplyAndClose: (code: string, blockId: string) => void;
    [key: string]: any;
}

// Component to render a single code block with Apply buttons
const QCodeBlock: React.FC<QCodeBlockProps> = ({ blockId, codeElement, onApplyAndClose, ...props }) => {
    const text = codeElement.textContent || '';
    const lines = text.split('\n');
    const qCommands = lines.filter((line: string) => line.trim().startsWith('q)'));

    return (
        <div id={blockId} className="code-block-with-buttons mb-4">
            <pre {...props} dangerouslySetInnerHTML={{ __html: codeElement.innerHTML }} />
            <div className="flex flex-wrap gap-2 mt-2 p-2 bg-white/5 rounded-b-lg border-t border-white/10">
                {qCommands.map((qCommand: string, index: number) => {
                    const code = qCommand.substring(qCommand.indexOf('q)') + 2).trim();
                    if (code) {
                        return (
                            <Button
                                key={index}
                                size="sm"
                                variant="outline"
                                onClick={() => onApplyAndClose(code, blockId)}
                                className="text-[#e5eef2] hover:bg-white/10 hover:text-[#e5eef2] border-white/20"
                            >
                                <Play className="h-4 w-4 mr-1" />
                                Apply: {code.length > 20 ? code.substring(0, 20) + '...' : code}
                            </Button>
                        );
                    }
                    return null;
                })}
            </div>
        </div>
    );
};

const domNodeToReact = (
    node: Node,
    key: string | number,
    onApplyAndClose: (code: string, blockId: string) => void,
    qBlockCounter: { count: number },
    idPrefix: string
): React.ReactNode => {
    if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent?.trim() === '') {
            return null;
        }
        return node.textContent;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        return null;
    }

    const elementNode = node as Element;
    const tagName = elementNode.tagName.toLowerCase();

    const props: { [key: string]: any } = { key };
    for (let i = 0; i < elementNode.attributes.length; i++) {
        const attr = elementNode.attributes[i];
        if (attr.name === 'style') {
            const styleObject: { [key: string]: string } = {};
            attr.value.split(';').forEach(style => {
                const [property, value] = style.split(':');
                if (property && value) {
                    const camelCaseProperty = property.trim().replace(/-(\w)/g, (_match, letter: string) => letter.toUpperCase());
                    styleObject[camelCaseProperty] = value.trim();
                }
            });
            props.style = styleObject;
        } else {
            const propName = attr.name === 'class' ? 'className' : attr.name;
            props[propName] = attr.value;
        }
    }

    if (tagName === 'pre') {
        const codeElement = elementNode.querySelector('code') || elementNode;
        const text = codeElement.textContent || '';
        const hasQCommands = text.split('\n').some((line: string) => line.trim().startsWith('q)'));

        const defaultPreClasses = 'rounded-md border border-white/10 bg-black/40 text-[#e5eef2] p-3 overflow-x-auto';
        props.className = props.className ? `${props.className} ${defaultPreClasses}` : defaultPreClasses;

        if (hasQCommands) {
            const blockId = `${idPrefix}-q-block-${qBlockCounter.count++}`;
            return <QCodeBlock {...props} blockId={blockId} codeElement={codeElement} onApplyAndClose={onApplyAndClose} />;
        }
        
        props.dangerouslySetInnerHTML = { __html: elementNode.innerHTML };
        return React.createElement(tagName, props);
    }
    
    const children = Array.from(elementNode.childNodes)
        .map((child, i) => domNodeToReact(child, i, onApplyAndClose, qBlockCounter, idPrefix))
        .filter(Boolean);

    return React.createElement(tagName, props, ...children);
};

interface HtmlRendererProps {
    html: string;
    onApplyAndClose: (code: string, blockId: string) => void;
    idPrefix: string;
}

export const HtmlRenderer: React.FC<HtmlRendererProps> = ({ html, onApplyAndClose, idPrefix }) => {
    if (typeof window === 'undefined') {
        return <div dangerouslySetInnerHTML={{ __html: html }} />;
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const qBlockCounter = { count: 0 };
    const reactElements = Array.from(tempDiv.childNodes).map((node, i) => domNodeToReact(node, i, onApplyAndClose, qBlockCounter, idPrefix));

    return <>{reactElements}</>;
}; 