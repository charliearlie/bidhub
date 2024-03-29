import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { SelectValue } from "@radix-ui/react-select";
import type { DataFunctionArgs } from "@remix-run/node";
import {
  json,
  unstable_createMemoryUploadHandler as createMemoryUploadHandler,
  unstable_parseMultipartFormData as parseMultipartFormData,
  redirect,
} from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { PoundSterlingIcon } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { DatePicker } from "~/components/common/date-picker";
import { SwitchWithLabel } from "~/components/common/switch-with-label";
import { Button } from "~/components/common/ui/button";
import { Card } from "~/components/common/ui/card/card";
import CardContent from "~/components/common/ui/card/card-content";
import { Label } from "~/components/common/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "~/components/common/ui/select";
import { FormField } from "~/components/form/form-field";
import { FormFieldTextArea } from "~/components/form/form-field-text-area";
import { SubmitButton } from "~/components/form/submit-button";

import {
  addListing,
  getCategoryDropdownOptions,
} from "~/services/listings.server";
import { getUserId } from "~/services/session.server";
import { FileSchema } from "~/services/zod-schemas";

import { UPLOAD_PRESET_ENUM, uploadImages } from "~/util/cloudinary.server";

const MAX_FILE_SIZE = 1024 * 1024 * 5; // 5mb
const CreateListingSchema = z
  .object({
    title: z
      .string({
        required_error: "Please enter a title",
      })
      .max(100),
    description: z
      .string({ required_error: "Please enter a description" })
      .max(1000),
    itemName: z
      .string({ required_error: "Please enter an item name" })
      .max(100),
    categoryId: z.string().max(100),
    quantity: z.number().max(100).default(1),
    buyItNowPrice: z.number().max(10000000).optional(),
    startingBid: z.number().max(100000).optional(),
    reservePrice: z.number().max(100000).optional(),
    minBidIncrement: z.number().max(100).optional(),
    itemId: z.string().optional(),
    endTime: z.string().optional(),
    images: z.array(FileSchema),
  })
  .refine(
    ({ buyItNowPrice, startingBid }) => {
      return (
        (buyItNowPrice !== null && startingBid !== null) ||
        buyItNowPrice !== null ||
        startingBid !== null
      );
    },
    {
      message: "Either Buy It Now Price or Starting Price must be specified.",
      path: ["buyItNowPrice", "startingBid"],
    }
  );

export const loader = async () => {
  const categoryDropdownOptions = await getCategoryDropdownOptions();

  return json({ categoryDropdownOptions } as const);
};

export const action = async ({ request }: DataFunctionArgs) => {
  const formData = await parseMultipartFormData(
    request,
    createMemoryUploadHandler({ maxPartSize: MAX_FILE_SIZE })
  );

  const submission = await parseWithZod(formData, {
    schema: CreateListingSchema,
  });

  if (submission.status !== "success") {
    return json(
      { result: submission.reply(), status: submission.status } as const,
      {
        status: submission.status === "error" ? 400 : 200,
      }
    );
  }

  const hasAtLeastOneImage = !!submission.value.images.length;

  const images = hasAtLeastOneImage
    ? await uploadImages(submission.value.images)
    : [];

  const [thumbnail] = hasAtLeastOneImage
    ? await uploadImages(
        submission.value.images[0],
        UPLOAD_PRESET_ENUM.bidhubListingThumbnail
      )
    : [];

  const { itemId, ...listingData } = submission.value;

  const userId = await getUserId(request);

  if (!userId) {
    return json({
      result: submission.reply({ formErrors: ["You must be logged in"] }),
      status: "error",
    } as const);
  }

  const newListing = await addListing(
    {
      ...listingData,
      buyItNowPrice: listingData.buyItNowPrice || null,
      startingBid: listingData.startingBid || null,
      minBidIncrement: listingData.minBidIncrement || null,
      images,
      thumbnail: thumbnail.imageUrl,
    },
    userId
  );

  if (!newListing) {
    return json({
      result: submission.reply({ formErrors: ["Something went wrong"] }),
      status: "error",
    } as const);
  }

  return redirect(`/listings/${newListing.slug}`);
};

export default function CreateListingRoute() {
  const [isAuction, setIsAuction] = useState(false);
  const actionData = useActionData<typeof action>();
  const { categoryDropdownOptions } = useLoaderData<typeof loader>();

  const [form, fields] = useForm({
    id: "create-listing-form",
    lastResult: actionData?.result,
    shouldValidate: "onBlur",
    constraint: getZodConstraint(CreateListingSchema),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: CreateListingSchema });
    },
    defaultValue: { quantity: 1, itemId: "", images: [] }, // We will get the item id if it exists
  });

  const images = fields.images.getFieldList();

  return (
    <Card>
      <CardContent className="md:p-8">
        <Form
          method="post"
          {...getFormProps(form)}
          encType="multipart/form-data"
        >
          <button type="submit" className="hidden">
            Submit
          </button>
          <FormField
            label="Title"
            helperText="This is what will be displayed in search results"
            errors={fields.title.errors} // These should work in the line above so need to fix - todo
            {...getInputProps(fields.title, { type: "text" })}
          />
          <FormFieldTextArea
            label="Description"
            errors={fields.description.errors}
            {...getInputProps(fields.description, { type: "text" })}
          />
          {/**
           * itemName will do some magic mapping to existing items
           * if necessary so will likely be a dropdown of some sorts
           * */}
          <FormField
            label="Item name"
            errors={fields.itemName.errors}
            helperText="Find your item or create a new one"
            {...getInputProps(fields.itemName, { type: "text" })}
          />
          {/**
           * Category is single select for now but will be multi select
           * todo: Make this a multi select
           * */}
          <div className="mb-8 flex w-full flex-col gap-1.5">
            <Label className="font-bold" htmlFor="category">
              Category
            </Label>
            <Select name="categoryId">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="h-48">
                {categoryDropdownOptions.map((option) => (
                  <SelectItem
                    className="cursor-pointer"
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <FormField
              label="Quantity"
              errors={fields.quantity.errors}
              {...getInputProps(fields.quantity, { type: "number" })}
            />
            <FormField
              label="Sale price"
              errors={fields.buyItNowPrice.errors}
              Icon={PoundSterlingIcon} // Will use a config for the user's currency
              {...getInputProps(fields.buyItNowPrice, { type: "number" })}
            />
          </div>
          <span className="text-[8px]">
            * This will be a component which takes multiple images eventually
          </span>
          {images.map((image) => (
            <FormField
              label="Image"
              accept="image/*"
              {...getInputProps(image, { type: "file" })}
            />
          ))}
          <div className="flex justify-end">
            <Button
              className="self-end"
              variant="outline"
              {...form.insert.getButtonProps({ name: fields.images.name })}
            >
              {images.length === 0 ? "Add image" : "Add another image"}
            </Button>
          </div>
          <SwitchWithLabel
            label="Auction"
            checked={isAuction}
            onCheckedChange={() => setIsAuction(!isAuction)}
          />
          {isAuction && (
            <div>
              <div className="mt-5 flex items-center space-x-2">
                <FormField
                  label="Starting price"
                  errors={fields.startingBid.errors}
                  Icon={PoundSterlingIcon}
                  {...getInputProps(fields.startingBid, { type: "number" })}
                />
                <FormField
                  label="Reserve price"
                  errors={fields.reservePrice.errors}
                  Icon={PoundSterlingIcon}
                  {...getInputProps(fields.reservePrice, { type: "number" })}
                />
              </div>
              <div className="mt-5 flex items-center space-x-2">
                <FormField
                  label="Smallest bid"
                  errors={fields.minBidIncrement.errors}
                  Icon={PoundSterlingIcon}
                  {...getInputProps(fields.minBidIncrement, { type: "number" })}
                />
                <div className="flex w-full flex-col gap-1.5">
                  <Label className="font-bold" htmlFor="date">
                    Date
                  </Label>
                  <DatePicker
                    name="endTime"
                    disabled={{ before: new Date() }}
                  />
                  <div className="flex min-h-[18px] items-start">
                    {JSON.stringify(fields.endTime.errors)}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="mt-4 flex md:justify-end">
            <SubmitButton className="w-full md:w-48" variant="default">
              Create listing
            </SubmitButton>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
