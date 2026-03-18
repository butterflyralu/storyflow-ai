import { useEffect, useState, useCallback } from 'react';
import { useWizard } from '@/context/WizardContext';
import { usePersistedContext } from '@/hooks/usePersistedContext';
import type { ProductContextInput } from '@/types/wizard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ContextWithId = ProductContextInput & { id: string };

export function ProductContextList() {
  const { setStep, setProductContext, setContextId, contextId } = useWizard();
  const { loadContexts, deleteContext } = usePersistedContext();
  const { toast } = useToast();

  const [contexts, setContexts] = useState<ContextWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await loadContexts();
    setContexts(data);
    setLoading(false);
  }, [loadContexts]);

  useEffect(() => {
    refresh();
  }, []);

  const handleEdit = (ctx: ContextWithId) => {
    setProductContext(ctx);
    setContextId(ctx.id);
    setStep(3);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const success = await deleteContext(deleteId);
    setDeleting(false);
    if (success) {
      toast({ title: 'Context deleted' });
      if (contextId === deleteId) {
        setContextId(null as any);
      }
      setContexts(prev => prev.filter(c => c.id !== deleteId));
    } else {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
    setDeleteId(null);
  };

  const platformLabel: Record<string, string> = {
    web: 'Web',
    mobile: 'Mobile',
    desktop: 'Desktop',
    both: 'Web + Mobile',
  };

  return (
    <div className="flex flex-col items-center px-4 py-8 h-full overflow-y-auto">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">Product Contexts</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage your product contexts</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="rounded-xl gap-1.5 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Chat
            </Button>
            <Button size="sm" onClick={() => setStep(1)} className="rounded-xl gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              New Product
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : contexts.length === 0 ? (
          <Card className="border-dashed border-2 rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">No product contexts yet</p>
              <Button size="sm" onClick={() => setStep(1)} className="rounded-xl gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Create your first product
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {contexts.map(ctx => (
              <Card
                key={ctx.id}
                className={`rounded-2xl transition-all duration-200 hover:shadow-soft ${
                  contextId === ctx.id ? 'border-primary/40 bg-accent/30' : ''
                }`}
              >
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm text-foreground truncate">{ctx.productName}</h3>
                      {contextId === ctx.id && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">Active</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {ctx.industry && (
                        <span className="text-xs text-muted-foreground">{ctx.industry}</span>
                      )}
                      {ctx.platform && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                          {platformLabel[ctx.platform] || ctx.platform}
                        </Badge>
                      )}
                      {ctx.productType && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 uppercase">
                          {ctx.productType}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg hover:bg-accent"
                      onClick={() => handleEdit(ctx)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteId(ctx.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product context?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this product context. Stories and sessions linked to it will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
