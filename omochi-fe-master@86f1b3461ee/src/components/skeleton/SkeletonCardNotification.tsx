import { Card, Skeleton } from "antd";

const SkeletonCardNotification = () => {
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
            className="!rounded-sm !w-3/4 !h-4"
          />
          <Skeleton.Input
            active
            size="small"
            className="!rounded-sm !w-full !h-4"
          />
        </div>
      </div>
    </Card>
  );
};

export default SkeletonCardNotification;
