def find_subset_backtrack(arr, target):
    arr = sorted(arr, reverse=True)
    n = len(arr)

    def dfs(i, current_sum, chosen):
        if current_sum == target:
            return chosen.copy()
        if i == n or current_sum > target:
            return None

        chosen.append(arr[i])
        found = dfs(i + 1, current_sum + arr[i], chosen)
        if found:
            return found
        chosen.pop()

        # пробуем не брать arr[i]
        return dfs(i + 1, current_sum, chosen)

    return dfs(0, 0, [])


print(find_subset_backtrack(arr=[1, 2, 3, 4, 5, 6, 7, 20], target=23))
