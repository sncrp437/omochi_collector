import { useCallback, useLayoutEffect, useState, useRef } from "react";
import { Button, Spin } from "antd";
import TopNavigationBar from "@/components/common/TopNavigationBar";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ROUTE_PATH, FormModeEnum } from "@/utils/constants";
import { IconAdd } from "@/assets/icons";
import {
  getListMenuItems,
  deleteMenuItem,
  getListMenuCategories,
  createNewMenuItem,
  updateMenuItem,
} from "@/api/venue";
import {
  MenuItem,
  MenuItemRequest,
  VenuesMenusCategoriesListMultilingualEnum,
  VenuesMenusItemsListMultilingualEnum,
} from "@/generated/api";
import { RootState } from "@/store";
import { useSelector } from "react-redux";
import { isEmpty } from "@/utils/helper";
import CardMenuItemManagement from "@/components/card/CardMenuItemManagement";
import SkeletonCardMenuItemManagement from "@/components/skeleton/SkeletonCardMenuItemManagement";
import DeleteConfirmationModal from "@/components/common/modal/venue/DeleteConfirmationModal";
import MenuItemFormModal from "@/components/common/modal/venue/MenuItemFormModal";
import { OptionType } from "@/types/common";
import { toast } from "react-toastify";

const MenuManagementPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const venueId = user?.venue_roles[0]?.venue_id || "";
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingFirst, setLoadingFirst] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [openMenuItemFormModal, setOpenMenuItemFormModal] =
    useState<string>("");
  const [menuCategories, setMenuCategories] = useState<OptionType[]>([]);
  const listMenuRef = useRef<HTMLDivElement>(null);

  const fetchMenuItems = useCallback(
    async (showSkeleton = true) => {
      try {
        if (showSkeleton) setLoadingFirst(true);
        const response = await getListMenuItems(
          venueId,
          undefined,
          VenuesMenusItemsListMultilingualEnum.False
        );
        if (!isEmpty(response)) {
          setMenuItems(response);
        }
      } catch (error) {
        console.error("Error fetching menu items:", error);
      } finally {
        if (showSkeleton) setLoadingFirst(false);
      }
    },
    [venueId]
  );

  useLayoutEffect(() => {
    const fetchAll = async () => {
      const menuPromise = fetchMenuItems(true);

      const categoriesPromise = getListMenuCategories(
        venueId,
        VenuesMenusCategoriesListMultilingualEnum.False
      )
        .then((res) => {
          if (!isEmpty(res)) {
            setMenuCategories(
              res.map((category) => ({
                value: category.id,
                label: category.name,
              }))
            );
          }
        })
        .catch((err) => {
          console.error("Error fetching menu categories:", err);
        });

      await Promise.allSettled([menuPromise, categoriesPromise]);
    };

    fetchAll();
  }, [fetchMenuItems, venueId]);

  // Handle open edit modal
  const handleOpenEdit = (item: MenuItem) => {
    setSelectedItem(item);
    setOpenMenuItemFormModal(FormModeEnum.EDIT);
  };

  // Handle open delete modal
  const handleOpenDelete = (event: React.MouseEvent, item: MenuItem) => {
    event.stopPropagation();
    setSelectedItem(item);
    setOpenDeleteModal(true);
  };

  // Handle close delete modal
  const handleCloseModal = () => {
    setSelectedItem(null);
    setOpenDeleteModal(false);
    setOpenMenuItemFormModal("");
  };

  // Handle confirm delete item
  const handleConfirmDeleteItem = async () => {
    if (selectedItem) {
      setRefreshing(true);
      try {
        await deleteMenuItem(venueId, selectedItem.id);
        toast.success(t("venue.toast.menu_item_delete_success"));
      } catch (error) {
        console.error("Error deleting menu item:", error);
      } finally {
        handleCloseModal();
        await fetchMenuItems(false);
        setRefreshing(false);
      }
    }
  };

  const handleConfirmMenuItemForm = async (values: MenuItemRequest) => {
    try {
      setRefreshing(true);
      const isAddFeature = openMenuItemFormModal === "add";
      let messageToast = "";

      if (isAddFeature) {
        await createNewMenuItem(venueId, values);
        messageToast = "venue.toast.menu_item_add_success";

        setTimeout(() => {
          listMenuRef.current?.scrollTo({ top: 0, behavior: "instant" });
        }, 100);
      } else if (selectedItem && selectedItem?.id) {
        await updateMenuItem(venueId, selectedItem.id, values);
        messageToast = "venue.toast.menu_item_edit_success";
      }
      if (messageToast) {
        toast.success(t(messageToast));
      }
    } catch (error) {
      console.error("Error confirming menu item form:", error);
      throw error;
    } finally {
      await fetchMenuItems(false);
      setRefreshing(false);
    }
  };

  return (
    <>
      <Spin
        spinning={refreshing}
        size="large"
        className="!w-full !h-full [&_.ant-spin-dot-spin]:!text-[var(--primary-color)]"
        wrapperClassName="[&_.ant-spin]:!max-h-[100%]"
      >
        <div className="flex flex-col items-center !h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
          {/* Top navigation bar */}
          <TopNavigationBar
            title={t("venue.title.menu_management_title")}
            onBack={() => navigate(`/${ROUTE_PATH.VENUE.DASHBOARD}`)}
          >
            <Button
              type="text"
              className="!outline-none !w-10 !h-10 !min-w-10 !min-h-10 !p-0 flex-row-center !bg-[var(--card-background-color)] hover:!bg-[#404040] !border-none !absolute !right-4"
              onClick={() => setOpenMenuItemFormModal(FormModeEnum.ADD)}
            >
              <IconAdd className="!w-5 !h-5 min-w-5 min-h-5 object-contain !text-white" />
            </Button>
          </TopNavigationBar>

          {/* Menu Management Content */}
          <div
            ref={listMenuRef}
            className="flex flex-col w-full h-full px-4 mt-4 gap-3 scrollbar-hidden overflow-y-auto motion-safe:scroll-smooth"
          >
            {loadingFirst ? (
              Array.from({ length: 6 }).map((_, index) => (
                <SkeletonCardMenuItemManagement key={index} />
              ))
            ) : isEmpty(menuItems) ? (
              <div className="flex-grow flex items-center justify-center py-4">
                <p className="text-sm-white">{t("general.no_data")}</p>
              </div>
            ) : (
              menuItems.map((item) => {
                return (
                  <CardMenuItemManagement
                    key={item.id}
                    menuItemDetails={item}
                    openEditModal={() => handleOpenEdit(item)}
                    openDeleteModal={(e: React.MouseEvent) =>
                      handleOpenDelete(e, item)
                    }
                    onClick={() => handleOpenEdit(item)}
                  />
                );
              })
            )}
          </div>
        </div>
      </Spin>

      <DeleteConfirmationModal
        isOpen={openDeleteModal}
        onClose={handleCloseModal}
        handleConfirm={handleConfirmDeleteItem}
        confirmationText={t("venue.label.delelte_item_confirmation_label")}
        loading={refreshing}
      />

      <MenuItemFormModal
        typeOpen={openMenuItemFormModal}
        onClose={handleCloseModal}
        handleConfirm={handleConfirmMenuItemForm}
        menuCategories={menuCategories}
        menuDetails={selectedItem}
        loading={refreshing}
      />
    </>
  );
};

export default MenuManagementPage;
