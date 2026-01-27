import { Card, Skeleton } from "antd";

const SkeletonCardCouponItem = () => {
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
      <div className="flex-row-between gap-2 w-full">
        <div className="w-[35%] min-w-[100px] max-w-[150px] rounded-[9px] flex-row-center bg-[var(--background-color)]">
          <Skeleton.Image
            active
            className="!w-full !h-full rounded-[9px] min-h-[90px] max-h-[80px]"
          />
        </div>

        <div className="flex-1 flex flex-col justify-around items-center h-full gap-6">
          <Skeleton.Input
            active
            size="small"
            className="!rounded-sm !w-3/5 !h-[14px]"
          />
          <Skeleton.Input
            active
            size="small"
            className="!rounded-sm !w-3/5 !h-[14px]"
          />
        </div>
      </div>
    </Card>
  );
};

export default SkeletonCardCouponItem;
