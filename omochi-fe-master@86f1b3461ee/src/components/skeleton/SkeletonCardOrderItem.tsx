import { Card, Skeleton } from "antd";

const SkeletonCardOrderItem = () => {
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
      <div className="flex gap-2">
        <div className="w-[35%] min-w-[100px] max-w-[180px] rounded-lg h-[100px]">
          <Skeleton.Image active className="!w-full !h-full rounded-lg" />
        </div>

        <div className="flex flex-col gap-1 pt-2 flex-1">
          <Skeleton.Input
            active
            size="small"
            className="!rounded-sm !w-full !h-4"
          />
          <Skeleton.Input
            active
            size="small"
            className="!rounded-sm !w-full !h-4"
          />
          <Skeleton.Input
            active
            size="small"
            className="!rounded-sm !w-full !h-4"
          />
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Skeleton.Input
              active
              size="small"
              className="!rounded-sm !flex !w-4/5 !h-4"
            />
            <Skeleton.Input
              active
              size="small"
              className="!rounded-sm !w-6 !min-w-6 !h-4"
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SkeletonCardOrderItem;
