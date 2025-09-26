
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, 
  Upload, 
  Settings, 
  Wifi, 
  WifiOff, 
  Globe, 
  Brain,
  FileUp,
  Paperclip,
  X,
  MessageCircle,
  Bot
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
  attachments?: FileAttachment[]
}

interface FileAttachment {
  name: string
  size: number
  type: string
  data?: string
}

interface MCPConfig {
  model: string
  webBrowsing: boolean
  embedding: string
  wsUrl: string
  authToken: string
}

export function MCPChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<FileAttachment[]>([])
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [isDragOver, setIsDragOver] = useState(false)
  const [config, setConfig] = useState<MCPConfig>({
    model: 'glm-4.5-flash',
    webBrowsing: false,
    embedding: 'kimi-native',
    wsUrl: 'ws://127.0.0.1:8765',
    authToken: ''
  })

  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const models = [
    { value: 'glm-4.5-flash', label: 'GLM-4.5 Flash' },
    { value: 'kimi', label: 'Kimi' },
    { value: 'deepseek', label: 'DeepSeek' },
    { value: 'openai', label: 'OpenAI GPT' }
  ]

  const embeddingOptions = [
    { value: 'kimi-native', label: 'Kimi Native' },
    { value: 'local-models', label: 'Local Models' },
    { value: 'supabase-pgvector', label: 'Supabase pg_vector' }
  ]

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setIsConnecting(true)
    const ws = new WebSocket(config.wsUrl)

    ws.onopen = () => {
      setIsConnected(true)
      setIsConnecting(false)
      toast({
        title: "Connected",
        description: "Successfully connected to MCP server",
      })

      // Send authentication if token is provided
      if (config.authToken) {
        ws.send(JSON.stringify({
          type: 'auth',
          token: config.authToken
        }))
      }
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleWebSocketMessage(data)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      toast({
        title: "Connection Error",
        description: "Failed to connect to MCP server",
        variant: "destructive"
      })
    }

    ws.onclose = () => {
      setIsConnected(false)
      setIsConnecting(false)
      setStreamingMessageId(null)
    }

    wsRef.current = ws
  }, [config.wsUrl, config.authToken, toast])

  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'message_start':
        const newMessageId = Date.now().toString()
        setMessages(prev => [...prev, {
          id: newMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          isStreaming: true
        }])
        setStreamingMessageId(newMessageId)
        break

      case 'message_chunk':
        if (streamingMessageId) {
          setMessages(prev => prev.map(msg => 
            msg.id === streamingMessageId 
              ? { ...msg, content: msg.content + (data.content || '') }
              : msg
          ))
        }
        break

      case 'message_end':
        setMessages(prev => prev.map(msg => 
          msg.id === streamingMessageId 
            ? { ...msg, isStreaming: false }
            : msg
        ))
        setStreamingMessageId(null)
        break

      case 'error':
        toast({
          title: "Error",
          description: data.message || "An error occurred",
          variant: "destructive"
        })
        setStreamingMessageId(null)
        break

      case 'file_upload_progress':
        setUploadProgress(prev => ({
          ...prev,
          [data.filename]: data.progress
        }))
        break

      case 'file_upload_complete':
        setUploadProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[data.filename]
          return newProgress
        })
        toast({
          title: "File Uploaded",
          description: `${data.filename} uploaded successfully`,
        })
        break
    }
  }, [streamingMessageId, toast])

  const sendMessage = useCallback(async () => {
    if (!currentMessage.trim() && uploadedFiles.length === 0) return
    if (!isConnected || !wsRef.current) {
      toast({
        title: "Not Connected",
        description: "Please connect to the MCP server first",
        variant: "destructive"
      })
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage,
      timestamp: new Date(),
      attachments: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined
    }

    setMessages(prev => [...prev, userMessage])
    
    const messageData = {
      type: 'chat',
      message: currentMessage,
      model: config.model,
      webBrowsing: config.webBrowsing,
      embedding: config.embedding,
      attachments: uploadedFiles.map(file => ({
        name: file.name,
        type: file.type,
        data: file.data
      }))
    }

    wsRef.current.send(JSON.stringify(messageData))
    
    setCurrentMessage('')
    setUploadedFiles([])
  }, [currentMessage, uploadedFiles, isConnected, config, toast])

  const handleFileUpload = useCallback((files: FileList) => {
    Array.from(files).forEach(file => {
      if (file.size > 33 * 1024 * 1024) { // 33MB limit
        toast({
          title: "File too large",
          description: `${file.name} exceeds 33MB limit`,
          variant: "destructive"
        })
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        const attachment: FileAttachment = {
          name: file.name,
          size: file.size,
          type: file.type,
          data: reader.result as string
        }
        setUploadedFiles(prev => [...prev, attachment])
      }
      reader.readAsDataURL(file)
    })
  }, [toast])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileUpload(e.dataTransfer.files)
  }, [handleFileUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const removeFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  return (
    <div className="h-screen flex flex-col max-w-7xl mx-auto p-4 gap-4">
      {/* Header */}
      <Card className="shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">EX-AI MCP Interface</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Direct connection to your MCP server
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
                {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isConnecting ? "Connecting..." : isConnected ? "Connected" : "Disconnected"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={connectWebSocket}
                disabled={isConnecting || isConnected}
              >
                <Settings className="h-4 w-4 mr-2" />
                Connect
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Settings Panel */}
        <Card className="w-80 flex-shrink-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Connection Settings */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">WebSocket URL</Label>
              <Input
                value={config.wsUrl}
                onChange={(e) => setConfig(prev => ({ ...prev, wsUrl: e.target.value }))}
                placeholder="ws://127.0.0.1:8765"
                disabled={isConnected}
              />
              <Input
                value={config.authToken}
                onChange={(e) => setConfig(prev => ({ ...prev, authToken: e.target.value }))}
                placeholder="Authentication token (optional)"
                type="password"
                disabled={isConnected}
              />
            </div>

            <Separator />

            {/* Model Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Model Selection</Label>
              <Select
                value={config.model}
                onValueChange={(value) => setConfig(prev => ({ ...prev, model: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        {model.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Web Browsing Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <Label>Web Browsing</Label>
              </div>
              <Switch
                checked={config.webBrowsing}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, webBrowsing: checked }))}
              />
            </div>

            <Separator />

            {/* Embedding Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Embedding Provider</Label>
              <Select
                value={config.embedding}
                onValueChange={(value) => setConfig(prev => ({ ...prev, embedding: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {embeddingOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Chat Interface
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0 p-0">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex",
                        message.role === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-4 py-2 shadow-sm",
                          message.role === 'user' 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted"
                        )}
                      >
                        <div className="whitespace-pre-wrap">
                          {message.content}
                          {message.isStreaming && (
                            <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse" />
                          )}
                        </div>
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {message.attachments.map((file, index) => (
                              <div key={index} className="flex items-center gap-2 text-xs opacity-80">
                                <Paperclip className="h-3 w-3" />
                                <span>{file.name}</span>
                                <span>({(file.size / 1024 / 1024).toFixed(1)}MB)</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="text-xs opacity-60 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* File Upload Area */}
            {uploadedFiles.length > 0 && (
              <div className="px-4 pb-2">
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <FileUp className="h-4 w-4 text-primary" />
                      <span className="text-sm flex-1">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(1)}MB
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {Object.keys(uploadProgress).length > 0 && (
              <div className="px-4 pb-2 space-y-2">
                {Object.entries(uploadProgress).map(([filename, progress]) => (
                  <div key={filename} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Uploading {filename}</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                ))}
              </div>
            )}

            {/* Input Area */}
            <div
              className={cn(
                "p-4 border-t",
                isDragOver && "bg-primary/5 border-primary border-dashed"
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0"
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Input
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder={
                    isDragOver 
                      ? "Drop files here..." 
                      : "Type your message... (drag & drop files to upload)"
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  disabled={!isConnected}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!isConnected || (!currentMessage.trim() && uploadedFiles.length === 0)}
                  className="flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
