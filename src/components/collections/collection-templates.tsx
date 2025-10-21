'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, Sparkles, Folder, Plus, 
  BookOpen, Code, Users, FileText,
  Loader2, Check, ArrowRight
} from 'lucide-react'
import { useToast } from '@/lib/hooks/use-toast'
import { useAuth } from '@/features/auth'
import { collectionTemplatesService } from '@/lib/services/collection-templates-service'
import type { CollectionTemplate } from '@/lib/services/collection-templates-service'
import { cn } from '@/lib/utils'

interface CollectionTemplatesProps {
  onTemplateSelect?: (collection: any) => void
  className?: string
}

export function CollectionTemplates({ onTemplateSelect, className }: CollectionTemplatesProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [templates, setTemplates] = useState<CollectionTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<CollectionTemplate[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<CollectionTemplate | null>(null)
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false)
  const [creating, setCreating] = useState(false)

  // Load templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const [allTemplates, allCategories] = await Promise.all([
          collectionTemplatesService.getTemplates(),
          Promise.resolve(collectionTemplatesService.getTemplateCategories())
        ])
        
        setTemplates(allTemplates)
        setFilteredTemplates(allTemplates)
        setCategories(['all', ...allCategories])
      } catch (error) {
        console.error('Error loading templates:', error)
        toast({
          title: 'Error',
          description: 'Failed to load collection templates',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadTemplates()
  }, [toast])

  // Filter templates
  useEffect(() => {
    let filtered = templates

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const searchResults = collectionTemplatesService.searchTemplates(searchQuery)
      filtered = filtered.filter(template => 
        searchResults.some(result => result.id === template.id)
      )
    }

    setFilteredTemplates(filtered)
  }, [templates, selectedCategory, searchQuery])

  const handleTemplateSelect = (template: CollectionTemplate) => {
    setSelectedTemplate(template)
    setShowCustomizeDialog(true)
  }

  const handleCreateFromTemplate = async (customization?: {
    title?: string
    description?: string
    is_public?: boolean
    is_collaborative?: boolean
  }) => {
    if (!selectedTemplate || !user) return

    setCreating(true)
    try {
      const collection = await collectionTemplatesService.createCollectionFromTemplate(
        selectedTemplate.id,
        user.id,
        customization
      )

      toast({
        title: 'Collection created',
        description: `"${collection.title}" has been created from template`,
      })

      onTemplateSelect?.(collection)
      setShowCustomizeDialog(false)
      setSelectedTemplate(null)
    } catch (error) {
      console.error('Error creating collection from template:', error)
      toast({
        title: 'Error',
        description: 'Failed to create collection from template',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  const getTemplateIcon = (template: CollectionTemplate) => {
    return template.icon || '📁'
  }

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'academic':
        return <BookOpen className="h-4 w-4" />
      case 'programming':
        return <Code className="h-4 w-4" />
      case 'research':
        return <FileText className="h-4 w-4" />
      case 'collaboration':
        return <Users className="h-4 w-4" />
      default:
        return <Folder className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            <p className="mt-2 text-sm text-muted-foreground">Loading templates...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Collection Templates
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-5">
              {categories.map((category) => (
                <TabsTrigger key={category} value={category} className="flex items-center gap-1">
                  {category !== 'all' && getCategoryIcon(category)}
                  <span className="capitalize">{category}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-6">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <Folder className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No templates found</h3>
                  <p className="mt-2 text-muted-foreground">
                    {searchQuery ? 'Try adjusting your search terms' : 'No templates available in this category'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onSelect={() => handleTemplateSelect(template)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Template Customization Dialog */}
      <TemplateCustomizationDialog
        template={selectedTemplate}
        isOpen={showCustomizeDialog}
        onClose={() => {
          setShowCustomizeDialog(false)
          setSelectedTemplate(null)
        }}
        onCreate={handleCreateFromTemplate}
        isCreating={creating}
      />
    </>
  )
}

interface TemplateCardProps {
  template: CollectionTemplate
  onSelect: () => void
}

function TemplateCard({ template, onSelect }: TemplateCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onSelect}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{template.icon}</span>
            <div>
              <h4 className="font-medium">{template.name}</h4>
              <Badge variant="outline" className="text-xs">
                {template.category}
              </Badge>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {template.usage_count} uses
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {template.description}
        </p>
        
        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              #{tag}
            </Badge>
          ))}
          {template.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{template.tags.length - 3}
            </Badge>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground">
          {template.structure.sections.length} sections
        </div>
      </CardContent>
    </Card>
  )
}

interface TemplateCustomizationDialogProps {
  template: CollectionTemplate | null
  isOpen: boolean
  onClose: () => void
  onCreate: (customization?: any) => void
  isCreating: boolean
}

function TemplateCustomizationDialog({
  template,
  isOpen,
  onClose,
  onCreate,
  isCreating
}: TemplateCustomizationDialogProps) {
  const [customization, setCustomization] = useState({
    title: '',
    description: '',
    is_public: false,
    is_collaborative: false
  })

  useEffect(() => {
    if (template) {
      setCustomization({
        title: `My ${template.name}`,
        description: template.description,
        is_public: false,
        is_collaborative: false
      })
    }
  }, [template])

  if (!template) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{template.icon}</span>
            Create from "{template.name}" Template
          </DialogTitle>
          <DialogDescription>
            Customize your collection before creating it from this template
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {template.structure.sections.map((section, index) => (
                  <div key={section.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                    <span className="text-sm font-medium">{index + 1}.</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{section.name}</div>
                      {section.description && (
                        <div className="text-xs text-muted-foreground">{section.description}</div>
                      )}
                    </div>
                    {section.resource_types && (
                      <div className="flex gap-1">
                        {section.resource_types.map(type => (
                          <Badge key={type} variant="outline" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Customization Form */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Collection Title</label>
              <Input
                value={customization.title}
                onChange={(e) => setCustomization(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter collection title"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={customization.description}
                onChange={(e) => setCustomization(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter collection description"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={customization.is_public}
                  onChange={(e) => setCustomization(prev => ({ ...prev, is_public: e.target.checked }))}
                />
                <span className="text-sm">Make public</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={customization.is_collaborative}
                  onChange={(e) => setCustomization(prev => ({ ...prev, is_collaborative: e.target.checked }))}
                />
                <span className="text-sm">Allow collaboration</span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={() => onCreate(customization)} disabled={isCreating}>
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Collection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}