import { LucideIcon } from 'lucide-react'
import { Button } from '@heroui/react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
}

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action 
}: EmptyStateProps) {
  const ActionIcon = action?.icon

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-muted/50 p-6 mb-6">
        <Icon className="h-12 w-12 text-muted-foreground" />
      </div>
      
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {title}
      </h3>
      
      <p className="text-muted-foreground max-w-md mb-8">
        {description}
      </p>
      
      {action && (
        <Button 
          color="primary" 
          size="lg"
          onPress={action.onClick}
          startContent={ActionIcon && <ActionIcon className="h-5 w-5" />}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
