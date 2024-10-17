import { FC, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useApiContext } from '@/providers/api'
import { prepareCreateVideoTx } from '@/lib/js-api'
import { toast } from 'sonner'
import { GetUserChannelsQuery } from '@/gql/graphql'
import { useTransactionContext } from '@/providers/transaction'

const formSchema = z.object({
  title: z
    .string()
    .min(1, 'Video title is required')
    .max(100, 'Video title must be 100 characters or less'),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less'),
  categoryId: z.string().min(1, 'Category is required'),
})

const categories = [
  { id: '4209396-2', name: 'Art' },
  { id: '4209546-2', name: 'Animation and Film' },
  { id: '4209572-2', name: 'Autos and Vehicles' },
  { id: '4209583-2', name: 'Business and Finance' },
  { id: '4209591-2', name: 'Crypto' },
  { id: '4209595-2', name: 'DIY' },
  { id: '4209603-2', name: 'Education' },
  { id: '4209609-2', name: 'Entertainment' },
  { id: '4209637-2', name: 'Lifestyle' },
  { id: '4209643-2', name: 'Memes and Humour' },
  { id: '4209650-2', name: 'Music and Music Videos' },
  { id: '4209658-2', name: 'Nature' },
  { id: '4209664-2', name: 'News and Current Affairs' },
  { id: '4209674-2', name: 'People and Blogs' },
  { id: '4209679-2', name: 'Pets and Animals' },
  { id: '4209685-2', name: 'Sports' },
  { id: '4209691-2', name: 'Technology' },
  { id: '4209700-2', name: 'Travel' },
  { id: '4209707-2', name: 'Unboxing' },
  { id: '4209721-2', name: 'Video Games' },
]

type VideoFormProps = {
  channel: GetUserChannelsQuery['channels'][number]
}

export const NewVideoTab: FC<VideoFormProps> = ({ channel }) => {
  const { api } = useApiContext()
  const { setTxForConfirmation } = useTransactionContext()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: 'test',
      description: 'test',
      categoryId: '4209396-2',
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!api) {
      toast.error('Unexpected error')
      console.error({ api })
      return
    }
    const tx = await prepareCreateVideoTx(api, {
      title: values.title,
      description: values.description,
      categoryId: values.categoryId,
      memberId: channel.ownerMember!.id,
      channelId: channel.id,
    })

    setTxForConfirmation(tx, channel.ownerMember!.controllerAccount)
  }

  return (
    <Form {...form}>
      <p className="text-sm text-gray-500 mb-2">
        Use the form below to create a new video on-chain. The video will be
        created without thumbnail or media assets. Once created, you can use the
        "Upload assets" tab to proceed.
      </p>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Video title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Video description"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gleev category</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit">Create Video</Button>
      </form>
    </Form>
  )
}
