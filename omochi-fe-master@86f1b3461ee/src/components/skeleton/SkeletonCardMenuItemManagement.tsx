import { Skeleton } from "antd";
import BaseCardVertical from "@/components/card/BaseCardVertical";
import { ASPECT_RATIO_IMAGE } from "@/utils/constants";

const SkeletonCardMenuItemManagement: React.FC = () => {
  return (
    <BaseCardVertical>
      <div className="flex flex-col gap-4 w-full">
        <div
          className="w-full rounded-[9px] overflow-hidden"
          style={{ aspectRatio: ASPECT_RATIO_IMAGE.MENU_ITEM }}
        >
          <Skeleton.Image active className="!w-full rounded-[9px] !h-full" />
        </div>
        <div className="flex flex-col gap-2 w-full">
          <div className="flex-row-between">
            <Skeleton.Input active size="small" className=" !h-[19px]" />
            <Skeleton.Input
              active
              size="small"
              className="!rounded-sm !w-[60px] !h-[19px] !min-w-[60px]"
            />
          </div>
          <Skeleton.Input
            active
            size="small"
            className="!rounded-sm !w-full !min-w-full"
          />
        </div>

        <div className="flex-row-between gap-2 !h-7">
          <Skeleton.Button
            active
            size="small"
            className="!flex-1 !h-full !w-full"
          />
          <Skeleton.Button
            active
            size="small"
            className="!flex-1 !h-full !w-full"
          />
          <Skeleton.Button
            active
            size="small"
            className="!h-full !w-[68px] !min-w-[68px]"
          />
          <Skeleton.Button
            active
            size="small"
            className="!h-full !w-[68px] !min-w-[68px]"
          />
        </div>
      </div>
    </BaseCardVertical>
  );
};

export default SkeletonCardMenuItemManagement;
