// BOJ - 3061 사다리

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int t; cin >> t;
    while(t--) {
        int n, ans = 0; cin >> n;
        vector<int> arr;
        loop(i, 1, n) { int k; cin >> k; arr.push_back(k); }
        LOOP(i, 0, n) LOOP(j, 0, n - 1)
            if(arr[j] > arr[j + 1])
                swap(arr[j], arr[j + 1]), ans++;

        cout << ans << '\n';
    }
}