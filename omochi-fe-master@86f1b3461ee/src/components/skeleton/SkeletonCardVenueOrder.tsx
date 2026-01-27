import { Card, Skeleton } from "antd";

const SkeletonCardVenueOrder = () => {
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
        <div className="w-[35%] min-w-[100px] max-w-[150px] rounded-[9px] flex-row-center bg-[var(--background-color)]">
          <Skeleton.Image
            active
            className="!w-full !h-full rounded-[9px] min-h-[70px] max-h-[80px]"
          />
        </div>

        <div className="flex flex-col gap-1 flex-1 justify-center cursor-pointer">
          <Skeleton.Input
            active
            size="small"
            className="!rounded-sm !w-4/5 !h-[14px]"
          />
          <Skeleton.Input
            active
            size="small"
            className="!rounded-sm !w-4/5 !h-[14px]"
          />
          <Skeleton.Input
            active
            size="small"
            className="!rounded-sm !w-4/5 !h-[14px]"
          />
          <Skeleton.Input
            active
            size="small"
            className="!rounded-sm !w-4/5 !h-[14px]"
          />
        </div>
      </div>
    </Card>
  );
};

export default SkeletonCardVenueOrder;
