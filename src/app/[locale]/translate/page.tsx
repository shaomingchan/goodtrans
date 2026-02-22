'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Loader2, Download, Copy, Check } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'ru', name: 'Русский' },
  { code: 'ar', name: 'العربية' },
  { code: 'pt', name: 'Português' },
];

const MODELS = [
  { id: 'claude', name: 'Claude 3.5 Sonnet', description: 'Highest quality, slower' },
  { id: 'qwen3.5-plus', name: 'Qwen3.5 Plus', description: 'Fast, 1M context' },
  { id: 'qwen3-coder-plus', name: 'Qwen3 Coder Plus', description: 'Best for code/tech docs' },
];

export default function TranslatePage() {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('zh');
  const [model, setModel] = useState('claude');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState('0.00');

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sourceText,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
          format: 'markdown',
          model,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setTranslatedText(data.translated);
        setCharCount(data.charCount);
        setEstimatedCost(data.estimatedCost);
      }
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = async () => {
    if (!translatedText) return;

    try {
      const response = await fetch('/api/translate/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Translation',
          content: translatedText,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
        }),
      });

      const data = await response.json();
      if (data.success) {
        const link = document.createElement('a');
        link.href = data.pdf;
        link.download = data.filename;
        link.click();
      }
    } catch (error) {
      console.error('PDF download error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">GoodTrans</h1>
          <p className="text-lg text-gray-600">Professional Translation Powered by AI</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Source */}
          <Card>
            <CardHeader>
              <CardTitle>Source Text</CardTitle>
              <CardDescription>Enter text to translate</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={sourceLang} onValueChange={setSourceLang}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Enter text to translate..."
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                className="min-h-64"
              />
              <div className="text-sm text-gray-500">
                Characters: {sourceText.length} | Estimated cost: ${estimatedCost}
              </div>
            </CardContent>
          </Card>

          {/* Target */}
          <Card>
            <CardHeader>
              <CardTitle>Translated Text</CardTitle>
              <CardDescription>Translation result</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={targetLang} onValueChange={setTargetLang}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Translation will appear here..."
                value={translatedText}
                readOnly
                className="min-h-64"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  onClick={handleDownloadPDF}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={!translatedText}
                >
                  <Download className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Model Selection */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Translation Engine</CardTitle>
            <CardDescription>Choose the AI model for translation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    model === m.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900">{m.name}</div>
                  <div className="text-sm text-gray-600">{m.description}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Translate Button */}
        <div className="mt-6 text-center">
          <Button
            onClick={handleTranslate}
            disabled={!sourceText.trim() || loading}
            size="lg"
            className="min-w-48"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Translating...
              </>
            ) : (
              'Translate'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
