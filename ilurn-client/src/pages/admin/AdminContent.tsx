import { type FormEvent, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { AssessmentItem, AssessmentItemType, AssessmentType } from '../../lib/types';

const assessmentOptions: { value: AssessmentType; label: string }[] = [
  { value: 'word-reading', label: 'Word Reading' },
  { value: 'spelling', label: 'Spelling Test' },
  { value: 'spelling-bee', label: 'Spelling Bee' },
];

const emptyItemForm = {
  item_type: 'word' as AssessmentItemType,
  text: '',
  sentence: '',
  difficulty: 'easy',
  sort_order: 0,
  active: true,
};

export function AdminContent() {
  const [items, setItems] = useState<AssessmentItem[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentType>('word-reading');
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [error, setError] = useState('');

  const loadItems = async (assessmentType = selectedAssessment) => {
    setError('');
    const response = await fetch(`/admin/assessment-items?assessment_type=${assessmentType}`, { credentials: 'include' });
    if (!response.ok) {
      setError('Unable to load test content for this admin account.');
      return;
    }
    const data = await response.json();
    setItems(data || []);
  };

  useEffect(() => {
    loadItems(selectedAssessment);
    setEditingItemId(null);
    setItemForm({ ...emptyItemForm, item_type: selectedAssessment === 'word-reading' ? 'letter' : 'word' });
  }, [selectedAssessment]);

  const handleEditItem = (item: AssessmentItem) => {
    setEditingItemId(item.id);
    setItemForm({
      item_type: item.item_type,
      text: item.text,
      sentence: item.sentence || '',
      difficulty: item.difficulty,
      sort_order: item.sort_order,
      active: item.active,
    });
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setItemForm({ ...emptyItemForm, item_type: selectedAssessment === 'word-reading' ? 'letter' : 'word' });
  };

  const handleSaveItem = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      assessment_type: selectedAssessment,
      item_type: itemForm.item_type,
      text: itemForm.text,
      sentence: itemForm.sentence || null,
      difficulty: itemForm.difficulty,
      sort_order: itemForm.sort_order,
      active: itemForm.active,
    };
    const response = await fetch(editingItemId ? `/admin/assessment-items/${editingItemId}` : '/admin/assessment-items', {
      method: editingItemId ? 'PATCH' : 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingItemId ? {
        item_type: payload.item_type,
        text: payload.text,
        sentence: payload.sentence,
        difficulty: payload.difficulty,
        sort_order: payload.sort_order,
        active: payload.active,
      } : payload),
    });
    if (!response.ok) {
      setError('Unable to save this test item. Check required fields.');
      return;
    }
    handleCancelEdit();
    await loadItems();
  };

  const handleDeleteItem = async (itemId: number) => {
    const response = await fetch(`/admin/assessment-items/${itemId}`, { method: 'DELETE', credentials: 'include' });
    if (!response.ok) {
      setError('Unable to delete this test item.');
      return;
    }
    await loadItems();
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Assessment content</h2>
          <p className="text-muted-foreground">Add, edit, deactivate, or delete prompts used by learner activities.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {assessmentOptions.map((option) => (
            <Button
              key={option.value}
              variant={selectedAssessment === option.value ? 'default' : 'outline'}
              className={selectedAssessment === option.value ? 'bg-violet-500 text-white hover:bg-violet-600' : undefined}
              onClick={() => setSelectedAssessment(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="border-2 border-violet-200 bg-violet-50">
          <CardHeader>
            <CardTitle>{editingItemId ? 'Edit Item' : 'Add Item'}</CardTitle>
            <CardDescription>Changes appear in learner activities immediately.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveItem} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="cms-item-type">
                Item Type
                <select
                  id="cms-item-type"
                  value={itemForm.item_type}
                  onChange={(event) => setItemForm((form) => ({ ...form, item_type: event.target.value as AssessmentItemType }))}
                  disabled={selectedAssessment !== 'word-reading'}
                  className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
                >
                  <option value="letter">Letter</option>
                  <option value="word">Word</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="cms-text">
                Prompt Text
                <Input id="cms-text" required value={itemForm.text} onChange={(event) => setItemForm((form) => ({ ...form, text: event.target.value }))} placeholder={selectedAssessment === 'word-reading' ? 'A or apple' : 'apple'} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="cms-sentence">
                Cue Sentence
                <Textarea id="cms-sentence" value={itemForm.sentence} onChange={(event) => setItemForm((form) => ({ ...form, sentence: event.target.value }))} placeholder={selectedAssessment === 'spelling' ? 'The apple is red.' : 'Optional'} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="cms-difficulty">
                  Difficulty
                  <Input id="cms-difficulty" required value={itemForm.difficulty} onChange={(event) => setItemForm((form) => ({ ...form, difficulty: event.target.value }))} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="cms-order">
                  Order
                  <Input id="cms-order" required type="number" min="0" value={itemForm.sort_order} onChange={(event) => setItemForm((form) => ({ ...form, sort_order: Number(event.target.value) }))} />
                </label>
              </div>
              <label className="flex items-center justify-between rounded-lg border bg-white p-3 text-sm font-medium">
                Active
                <Switch checked={itemForm.active} onCheckedChange={(checked) => setItemForm((form) => ({ ...form, active: checked }))} />
              </label>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-violet-500 text-white hover:bg-violet-600">
                  <Plus data-icon="inline-start" />
                  {editingItemId ? 'Save Item' : 'Add Item'}
                </Button>
                {editingItemId && <Button type="button" variant="outline" onClick={handleCancelEdit}>Cancel</Button>}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Item Bank</CardTitle>
            <CardDescription>{items.length} prompts in this assessment.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Text</TableHead>
                  <TableHead>Sentence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-muted-foreground">{item.sort_order}</TableCell>
                    <TableCell>{item.item_type}</TableCell>
                    <TableCell className="font-medium">{item.text}</TableCell>
                    <TableCell className="max-w-[280px] truncate text-muted-foreground">{item.sentence || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={item.active ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'}
                      >
                        {item.active ? 'Active' : 'Hidden'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditItem(item)}>
                          <Pencil data-icon="inline-start" />
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 data-icon="inline-start" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No items found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
