import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, CheckCircle, Circle } from 'lucide-react';

const EnhancedAssessmentTemplateSelector = ({ onSelect, selectedTemplateId }) => {
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchTemplates();
    fetchCategories();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/assessment-templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/assessment-templates/categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'standardized' && template.isStandardized) ||
                      (activeTab === 'custom' && !template.isStandardized);
    
    return matchesSearch && matchesCategory && matchesTab;
  });

  const getCategoryBadgeColor = (category) => {
    const colors = {
      'pain_assessment': 'bg-red-100 text-red-800',
      'mental_health': 'bg-blue-100 text-blue-800',
      'functional_assessment': 'bg-green-100 text-green-800',
      'quality_of_life': 'bg-purple-100 text-purple-800',
      'custom': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const formatCategoryName = (category) => {
    return category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Custom';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {formatCategoryName(category)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Templates</TabsTrigger>
            <TabsTrigger value="standardized">Standardized</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <div className="grid gap-4">
              {filteredTemplates.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-500">No templates found matching your criteria.</p>
                  </CardContent>
                </Card>
              ) : (
                filteredTemplates.map(template => (
                  <Card 
                    key={template.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedTemplateId === template.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => onSelect(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            {selectedTemplateId === template.id ? (
                              <CheckCircle className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Circle className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {template.isStandardized ? (
                              <Badge className="bg-green-100 text-green-800">
                                Standardized
                              </Badge>
                            ) : (
                              <Badge variant="outline">Custom</Badge>
                            )}
                            {template.category && (
                              <Badge className={getCategoryBadgeColor(template.category)}>
                                {formatCategoryName(template.category)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {template.description && (
                        <p className="text-gray-600 text-sm mb-3">{template.description}</p>
                      )}
                      
                      {template.isStandardized && template.validationInfo && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <h4 className="font-medium text-sm mb-2">Clinical Information</h4>
                          <div className="text-xs text-gray-600 space-y-1">
                            {template.validationInfo.developer && (
                              <p><strong>Developer:</strong> {template.validationInfo.developer}</p>
                            )}
                            {template.validationInfo.validation && (
                              <p><strong>Validation:</strong> {template.validationInfo.validation}</p>
                            )}
                            {template.clinicalUse && (
                              <p><strong>Clinical Use:</strong> {template.clinicalUse}</p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{template.items?.length || 0} items</span>
                        <span>Version {template.version}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EnhancedAssessmentTemplateSelector;