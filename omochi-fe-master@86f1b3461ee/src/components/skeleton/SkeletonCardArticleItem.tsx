import { Card, Skeleton } from "antd";

const SkeletonCardArticleItem = () => {
  return (
    <Card
      hoverable
      variant="borderless"
      className="!bg-[var(--card-background-color)] !rounded-2xl hover:!bg-[#404040]"
      styles={{
        body: {
          padding: "10px",
        },
      }}
    >
      <div className="flex flex-col gap-4 w-full">
        <div className="w-full rounded-[9px]">
          <Skeleton.Image
            active
            className="!w-full !h-full !aspect-[4/3] !rounded-[9px]"
          />
        </div>

        {/* Content skeleton */}
        <div className="flex flex-col gap-4 w-full">
          <div className="flex flex-col gap-[10px] w-full">
            <Skeleton.Input
              active
              size="small"
              className="!rounded-sm !w-full !h-4"
            />

            <Skeleton.Input
              active
              size="small"
              className="!rounded-sm !w-full !h-3"
            />
          </div>

          {/* Button skeleton */}
          <div className="mt-2">
            <Skeleton.Button
              active
              size="small"
              className="!w-full !h-10 !rounded-xl"
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SkeletonCardArticleItem;
